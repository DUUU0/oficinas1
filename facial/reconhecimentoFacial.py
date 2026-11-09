import argparse
import io
import os
import sys
import time
import urllib.request
from datetime import datetime

import cv2
import numpy as np
import psycopg
import serial
from PIL import Image, ImageDraw, ImageFont, ImageOps
from serial.tools import list_ports

DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))
DIRETORIO_MODELOS = os.path.join(DIRETORIO_BASE, "modelos")

BANCO = {
    "host": "localhost",
    "port": 5432,
    "dbname": "oficinasBD",
    "user": "postgres",
    "password": "postgres",
}
# face.encoding guarda a FOTO enviada pelo site; o vetor do rosto é calculado aqui.
SQL_ASSINATURAS = """
    SELECT f.id, f.professor_id, p.nome, md5(f.encoding)
    FROM face f JOIN professor p ON p.id = f.professor_id
    ORDER BY f.id
"""
SQL_FOTOS = """
    SELECT f.professor_id, p.nome, md5(f.encoding), f.encoding
    FROM face f JOIN professor p ON p.id = f.professor_id
    ORDER BY f.id
"""
INTERVALO_RECARGA_BANCO = 30

MODELOS = {
    "detector": (
        "face_detection_yunet_2023mar.onnx",
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    ),
    "reconhecedor": (
        "face_recognition_sface_2021dec.onnx",
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    ),
}

LARGURA_CAMERA = 1280
ALTURA_CAMERA = 720

ESCALA_DETECCAO = 0.5
CONFIANCA_MINIMA_DETECCAO = 0.7
PROCESSAR_A_CADA_N_FRAMES = 2
TAMANHOS_DETECCAO_CADASTRO = (480, 960, 1280)

# Similaridade de cosseno do SFace (limite oficial: 0.363).
SIMILARIDADE_MINIMA = 0.42
MARGEM_MINIMA_ENTRE_PESSOAS = 0.05
SIMILARIDADE_FORTE = 0.70

TEMPO_PERDA_SEGUNDOS = 2.5
# Rosto sem nome perto da última posição (cabeça virada) segue como alvo por este tempo.
TEMPO_MAXIMO_SEM_CONFIRMAR = 3.0
DISTANCIA_MAXIMA_LARGURAS = 1.5

BAUD_ESP32 = 115200
PALAVRAS_PORTA_ESP32 = ("CP210", "CH340", "CH910", "CH343",
                        "USB SERIAL", "USB-SERIAL", "UART")

INTERVALO_AVISO_SEGUNDOS = 30
AUMENTO_MINIMO_CERTEZA = 5

COR_ALVO = (0, 200, 0)
COR_RECONHECIDO = (200, 140, 0)
COR_DESCONHECIDO = (0, 0, 255)


def baixar_modelo(chave):
    nome_arquivo, url = MODELOS[chave]
    caminho = os.path.join(DIRETORIO_MODELOS, nome_arquivo)

    if os.path.exists(caminho):
        return caminho

    os.makedirs(DIRETORIO_MODELOS, exist_ok=True)
    print(f"[INFO] Baixando modelo '{nome_arquivo}' (só acontece uma vez)...")
    caminho_temporario = caminho + ".part"
    urllib.request.urlretrieve(url, caminho_temporario)
    os.replace(caminho_temporario, caminho)
    return caminho


def carregar_modelos():
    try:
        detector = cv2.FaceDetectorYN.create(
            baixar_modelo("detector"), "", (320, 320), CONFIANCA_MINIMA_DETECCAO)
        reconhecedor = cv2.FaceRecognizerSF.create(
            baixar_modelo("reconhecedor"), "")
    except Exception as e:
        print(f"\n[ERRO] Não foi possível carregar os modelos de rosto: {e}")
        print("Solução: Verifique a conexão com a internet na primeira execução, ou apague a pasta 'modelos' e tente de novo.")
        sys.exit(1)

    return detector, reconhecedor


def detectar_rostos(detector, imagem):
    altura, largura = imagem.shape[:2]
    detector.setInputSize((largura, altura))
    _, rostos = detector.detect(imagem)
    return rostos if rostos is not None else np.empty((0, 15), dtype=np.float32)


def extrair_encoding(reconhecedor, imagem, rosto):
    rosto_alinhado = reconhecedor.alignCrop(imagem, rosto)
    encoding = reconhecedor.feature(rosto_alinhado).flatten()
    return encoding / np.linalg.norm(encoding)


def carregar_imagem(foto):
    with Image.open(io.BytesIO(foto)) as imagem:
        imagem = ImageOps.exif_transpose(imagem).convert("RGB")
        return cv2.cvtColor(np.array(imagem), cv2.COLOR_RGB2BGR)


def encoding_da_foto(detector, reconhecedor, foto):
    imagem = carregar_imagem(foto)
    maior_lado = max(imagem.shape[:2])

    # O detector erra rostos muito grandes na imagem, então testa vários tamanhos
    melhor = None
    for tamanho in TAMANHOS_DETECCAO_CADASTRO:
        fator = min(1.0, tamanho / maior_lado)
        reduzida = cv2.resize(imagem, (0, 0), fx=fator, fy=fator,
                              interpolation=cv2.INTER_AREA)
        rostos = detectar_rostos(detector, reduzida)
        if len(rostos) == 0:
            continue

        maior_rosto = max(rostos, key=lambda r: r[2] * r[3])
        if melhor is None or maior_rosto[14] > melhor[1][14]:
            melhor = (reduzida, maior_rosto, len(rostos))

    if melhor is None:
        return None, 0

    reduzida, rosto, quantidade_rostos = melhor
    return extrair_encoding(reconhecedor, reduzida, rosto), quantidade_rostos


def consultar_banco(sql):
    with psycopg.connect(**BANCO, connect_timeout=5) as conexao:
        return conexao.execute(sql).fetchall()


def montar_cadastro(detector, reconhecedor):
    encodings_por_professor = {}
    nomes = {}
    dono_da_foto = {}

    for professor_id, nome, hash_foto, foto in consultar_banco(SQL_FOTOS):
        nome = nome.strip()
        nomes[professor_id] = nome

        # A mesma foto em dois professores daria empate e nenhum seria reconhecido
        dono = dono_da_foto.setdefault(hash_foto, professor_id)
        if dono != professor_id:
            print(
                f"[AVISO] '{nome}' usa a mesma foto de '{nomes[dono]}'. Foto ignorada.")
            continue

        try:
            encoding, quantidade_rostos = encoding_da_foto(
                detector, reconhecedor, bytes(foto))
        except Exception as e:
            print(f"[ERRO] Falha ao processar a foto de '{nome}': {e}")
            continue

        if encoding is None:
            print(
                f"[AVISO] Nenhum rosto detectado na foto de '{nome}'. Ignorando.")
            continue
        if quantidade_rostos > 1:
            print(
                f"[AVISO] Mais de um rosto na foto de '{nome}'. Usando o maior rosto.")

        encodings_por_professor.setdefault(professor_id, []).append(encoding)

    if not encodings_por_professor:
        return [], None

    professores = [(pid, nomes[pid]) for pid in encodings_por_professor]
    matriz = np.array([np.mean(encodings_por_professor[pid], axis=0)
                      for pid, _ in professores])
    matriz /= np.linalg.norm(matriz, axis=1, keepdims=True)

    print(f"[INFO] {len(professores)} professor(es) prontos: "
          f"{', '.join(nome for _, nome in professores)}\n")
    return professores, matriz


def identificar(encoding, matriz_conhecidos):
    similaridades = matriz_conhecidos @ encoding
    ordem = np.argsort(similaridades)[::-1]
    melhor = similaridades[ordem[0]]
    segundo = similaridades[ordem[1]] if len(ordem) > 1 else -1.0

    if melhor < SIMILARIDADE_MINIMA:
        return None, 0
    if melhor - segundo < MARGEM_MINIMA_ENTRE_PESSOAS:
        return None, 0
    return int(ordem[0]), calcular_certeza(melhor)


def calcular_certeza(similaridade):
    proporcao = (similaridade - SIMILARIDADE_MINIMA) / \
        (SIMILARIDADE_FORTE - SIMILARIDADE_MINIMA)
    return int(round(50 + 50 * min(max(proporcao, 0.0), 1.0)))


class Alvo:
    def __init__(self, rosto, agora):
        self.professor_id = rosto["professor_id"]
        self.nome = rosto["nome"]
        self.confirmado_em = agora
        self.atualizar(rosto, agora)

    def atualizar(self, rosto, agora):
        self.centro = rosto["centro"]
        self.largura = rosto["largura"]
        self.visto_em = agora


def achar_rosto_do_alvo(alvo, rostos, agora):
    for rosto in rostos:
        if rosto["professor_id"] == alvo.professor_id:
            alvo.confirmado_em = agora
            return rosto

    if agora - alvo.confirmado_em > TEMPO_MAXIMO_SEM_CONFIRMAR:
        return None

    sem_nome = [r for r in rostos if r["professor_id"] is None]
    if not sem_nome:
        return None

    def distancia(rosto):
        return np.hypot(rosto["centro"][0] - alvo.centro[0], rosto["centro"][1] - alvo.centro[1])

    mais_proximo = min(sem_nome, key=distancia)
    if distancia(mais_proximo) <= DISTANCIA_MAXIMA_LARGURAS * alvo.largura:
        return mais_proximo
    return None


def atualizar_alvo(alvo, rostos, agora):
    """O primeiro professor visto continua sendo o alvo até sumir."""
    if alvo is not None:
        rosto = achar_rosto_do_alvo(alvo, rostos, agora)
        if rosto is not None:
            alvo.atualizar(rosto, agora)
            return alvo, rosto
        if agora - alvo.visto_em <= TEMPO_PERDA_SEGUNDOS:
            return alvo, None
        print(f"[{datetime.now():%H:%M:%S}] Alvo perdido: {alvo.nome}")

    reconhecidos = [r for r in rostos if r["professor_id"] is not None]
    if not reconhecidos:
        return None, None

    rosto = max(reconhecidos, key=lambda r: r["largura"])
    alvo = Alvo(rosto, agora)
    print(f"[{datetime.now():%H:%M:%S}] Alvo travado: {alvo.nome}")
    return alvo, rosto


def montar_comando(alvo, rosto, largura_frame, altura_frame):
    if rosto is not None:
        erro_x = (rosto["centro"][0] - largura_frame / 2) / (largura_frame / 2)
        erro_y = (rosto["centro"][1] - altura_frame / 2) / (altura_frame / 2)
        return f"T,{int(round(erro_x * 1000))},{int(round(erro_y * 1000))}"
    return "H" if alvo is not None else "N"


class LigacaoESP32:

    def __init__(self, porta):
        self.conexao = None
        self.recebido = b""

        porta = porta or self.encontrar_porta()
        if porta is None:
            print(
                "[AVISO] ESP32 não encontrado. Rodando só o reconhecimento (use --porta COMx).")
            return

        try:
            conexao = serial.Serial()
            conexao.port = porta
            conexao.baudrate = BAUD_ESP32
            conexao.timeout = 0
            conexao.write_timeout = 0.1
            # DTR/RTS desligados antes de abrir: assim a porta não reinicia a placa
            conexao.dtr = False
            conexao.rts = False
            conexao.open()
        except serial.SerialException as e:
            print(f"[AVISO] Não foi possível abrir {porta}: {e}")
            print(
                "Solução: Feche o Monitor Serial do Arduino IDE. Rodando só o reconhecimento.")
            return

        # Caso a placa reinicie mesmo assim, espera ela terminar o boot
        time.sleep(2)
        conexao.reset_input_buffer()
        self.conexao = conexao
        print(f"[INFO] ESP32 conectado em {porta}.")

    @staticmethod
    def encontrar_porta():
        for porta in list_ports.comports():
            descricao = f"{porta.description} {porta.manufacturer or ''}".upper()
            if any(palavra in descricao for palavra in PALAVRAS_PORTA_ESP32):
                return porta.device
        return None

    def trocar_comando(self, comando):
        if self.conexao is None:
            return
        try:
            self.conexao.write((comando + "\n").encode("ascii"))
            self.recebido += self.conexao.read(self.conexao.in_waiting or 1)
        except serial.SerialException as e:
            print(f"[ERRO] Conexão com o ESP32 caiu: {e}")
            self.fechar()
            return

        *linhas, self.recebido = self.recebido.split(b"\n")
        for linha in linhas:
            print(f"[ESP32] {linha.decode('ascii', 'replace').strip()}")

    def fechar(self):
        if self.conexao is not None:
            self.conexao.close()
            self.conexao = None


def carregar_fonte(tamanho):
    for caminho in ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(caminho):
            return ImageFont.truetype(caminho, tamanho)
    return ImageFont.load_default(size=tamanho)


def desenhar_resultados(frame, resultados, fonte):
    for (esquerda, topo, direita, baixo), _, cor in resultados:
        cv2.rectangle(frame, (esquerda, topo), (direita, baixo), cor, 2)
        cv2.rectangle(frame, (esquerda, baixo - 35),
                      (direita, baixo), cor, cv2.FILLED)

    if not resultados:
        return frame

    # O cv2.putText não desenha acentos (João vira Jo??o), por isso o texto vai pelo Pillow
    imagem = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    desenho = ImageDraw.Draw(imagem)
    for (esquerda, _, _, baixo), texto, _ in resultados:
        desenho.text((esquerda + 6, baixo - 31), texto,
                     font=fonte, fill=(255, 255, 255))
    return cv2.cvtColor(np.array(imagem), cv2.COLOR_RGB2BGR)


def avisar_aparicao(nome, certeza, ultimo_aviso_por_pessoa):
    agora = time.monotonic()
    ultimo_aviso = ultimo_aviso_por_pessoa.get(nome)

    if ultimo_aviso is not None:
        momento_anterior, certeza_anterior = ultimo_aviso
        dentro_do_intervalo = agora - momento_anterior < INTERVALO_AVISO_SEGUNDOS
        certeza_subiu = certeza >= certeza_anterior + AUMENTO_MINIMO_CERTEZA
        if dentro_do_intervalo and not certeza_subiu:
            return

    ultimo_aviso_por_pessoa[nome] = (agora, certeza)
    print(f"[{datetime.now():%H:%M:%S}] {nome} apareceu! (certeza: {certeza}%)")


def analisar_frame(frame, detector, reconhecedor, professores, matriz):
    frame_pequeno = cv2.resize(
        frame, (0, 0), fx=ESCALA_DETECCAO, fy=ESCALA_DETECCAO)

    analisados = []
    for rosto in detectar_rostos(detector, frame_pequeno):
        rosto = rosto.copy()
        rosto[:14] /= ESCALA_DETECCAO
        x, y, largura, altura = rosto[:4].astype(int)

        encoding = extrair_encoding(reconhecedor, frame, rosto)
        indice, certeza = identificar(encoding, matriz)
        professor_id, nome = professores[indice] if indice is not None else (
            None, None)

        analisados.append({
            "caixa": (x, y, x + largura, y + altura),
            "centro": (x + largura / 2, y + altura / 2),
            "largura": largura,
            "professor_id": professor_id,
            "nome": nome,
            "certeza": certeza,
        })
    return analisados


def montar_desenho(rostos, rosto_alvo):
    resultados = []
    for rosto in rostos:
        if rosto is rosto_alvo:
            nome = rosto["nome"] or "alvo"
            resultados.append((rosto["caixa"], f"[ALVO] {nome}", COR_ALVO))
        elif rosto["nome"] is not None:
            resultados.append(
                (rosto["caixa"], f"{rosto['nome']} {rosto['certeza']}%", COR_RECONHECIDO))
        else:
            resultados.append(
                (rosto["caixa"], "Desconhecido", COR_DESCONHECIDO))
    return resultados


def banco_mudou(assinaturas_atuais):
    try:
        novas = consultar_banco(SQL_ASSINATURAS)
    except psycopg.Error as e:
        print(
            f"[AVISO] Falha ao consultar o banco, mantendo o cadastro atual: {e}")
        return None
    return novas if novas != assinaturas_atuais else None


def iniciar_camera(indice_camera, detector, reconhecedor, professores, matriz, assinaturas, esp32):
    print("[INFO] Iniciando a câmera. Pressione 'Q' ou 'ESC' para sair.")

    captura_video = cv2.VideoCapture(indice_camera, cv2.CAP_DSHOW)

    captura_video.set(cv2.CAP_PROP_FRAME_WIDTH, LARGURA_CAMERA)
    captura_video.set(cv2.CAP_PROP_FRAME_HEIGHT, ALTURA_CAMERA)
    captura_video.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not captura_video.isOpened():
        print("\n[ERRO] Não foi possível acessar a câmera.")
        print("Solução: Verifique se a webcam está conectada, se não está sendo usada por outro aplicativo, ou tente outro índice (--camera 1).")
        sys.exit(1)

    fonte = carregar_fonte(20)
    resultados = []
    contador_frames = 0
    ultimo_aviso_por_pessoa = {}
    alvo = None
    ultima_recarga = time.monotonic()

    while True:
        sucesso, frame = captura_video.read()
        if not sucesso:
            print("[ERRO] Falha ao capturar imagem da câmera.")
            break

        if contador_frames % PROCESSAR_A_CADA_N_FRAMES == 0:
            agora = time.monotonic()

            if agora - ultima_recarga >= INTERVALO_RECARGA_BANCO:
                ultima_recarga = agora
                novas_assinaturas = banco_mudou(assinaturas)
                if novas_assinaturas is not None:
                    print("[INFO] Cadastro alterado no site, atualizando...")
                    novos_professores, nova_matriz = montar_cadastro(
                        detector, reconhecedor)
                    assinaturas = novas_assinaturas
                    if novos_professores:
                        professores, matriz = novos_professores, nova_matriz

            rostos = analisar_frame(
                frame, detector, reconhecedor, professores, matriz)
            for rosto in rostos:
                if rosto["nome"] is not None:
                    avisar_aparicao(
                        rosto["nome"], rosto["certeza"], ultimo_aviso_por_pessoa)

            alvo, rosto_alvo = atualizar_alvo(alvo, rostos, agora)
            altura_frame, largura_frame = frame.shape[:2]
            esp32.trocar_comando(montar_comando(
                alvo, rosto_alvo, largura_frame, altura_frame))
            resultados = montar_desenho(rostos, rosto_alvo)

        contador_frames += 1

        frame = desenhar_resultados(frame, resultados, fonte)
        cv2.imshow('Reconhecimento Facial em Tempo Real', frame)

        tecla = cv2.waitKey(1) & 0xFF
        if tecla == ord('q') or tecla == 27:
            break

    captura_video.release()
    cv2.destroyAllWindows()
    print("[INFO] Programa encerrado corretamente.")


def ler_argumentos():
    parser = argparse.ArgumentParser(
        description="Reconhecimento facial com Pan-Tilt.")
    parser.add_argument("--camera", type=int, default=0,
                        help="índice da câmera (padrão: 0)")
    parser.add_argument(
        "--porta", help="porta do ESP32, ex: COM3 (padrão: detecta sozinho)")
    return parser.parse_args()


def main():
    argumentos = ler_argumentos()
    detector, reconhecedor = carregar_modelos()

    print("[INFO] Carregando os professores do banco de dados...")
    try:
        assinaturas = consultar_banco(SQL_ASSINATURAS)
        professores, matriz = montar_cadastro(detector, reconhecedor)
    except psycopg.Error as e:
        print(
            f"\n[ERRO] Não foi possível ler o banco '{BANCO['dbname']}': {e}")
        print("Solução: Verifique se o PostgreSQL está rodando e se o backend já criou as tabelas.")
        sys.exit(1)

    if not professores:
        print("\n[ERRO] Nenhum professor com foto válida no banco.")
        print("Solução: Cadastre professores com uma foto nítida do rosto pelo site.")
        sys.exit(1)

    esp32 = LigacaoESP32(argumentos.porta)
    try:
        iniciar_camera(argumentos.camera, detector, reconhecedor,
                       professores, matriz, assinaturas, esp32)
    finally:
        esp32.fechar()


if __name__ == "__main__":
    main()
