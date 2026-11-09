import os
import re
import sys

import cv2
import easyocr
import numpy as np

DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))

PARAMETROS_OCR = {
    "mag_ratio": 0.5,
    "width_ths": 2.0,
    "decoder": "beamsearch",
}

# Em palavras com letras, dígitos parecidos são erros do OCR ("D0" -> "DO").
TROCAS_EM_PALAVRAS = str.maketrans(
    {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "&": "R"})

_leitor = None


def obter_leitor():
    global _leitor
    if _leitor is None:
        _leitor = easyocr.Reader(['pt', 'en'], gpu=False, verbose=False)
    return _leitor


def tratar_quadro(caminho_imagem, salvar_em=None):
    imagem = cv2.imread(caminho_imagem)
    if imagem is None:
        raise FileNotFoundError(f"Não foi possível abrir a imagem '{caminho_imagem}'")

    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)

    # Divide pela iluminação estimada do fundo; binarizar piorava o OCR por quebrar o traço.
    fundo = cv2.dilate(cinza, np.ones((7, 7), np.uint8))
    fundo = cv2.medianBlur(fundo, 31)
    sem_fundo = cv2.divide(cinza, fundo, scale=255)

    if salvar_em:
        cv2.imwrite(salvar_em, sem_fundo)
    return sem_fundo


def organizar_em_linhas(resultados):
    trechos = []
    for caixa, texto, _ in resultados:
        ys = [ponto[1] for ponto in caixa]
        xs = [ponto[0] for ponto in caixa]
        trechos.append({
            "centro_y": (min(ys) + max(ys)) / 2,
            "altura": max(ys) - min(ys),
            "x": min(xs),
            "texto": texto,
        })

    trechos.sort(key=lambda t: t["centro_y"])

    linhas = []
    for trecho in trechos:
        if linhas:
            anterior = linhas[-1][-1]
            tolerancia = 0.5 * max(trecho["altura"], anterior["altura"])
            if abs(trecho["centro_y"] - anterior["centro_y"]) < tolerancia:
                linhas[-1].append(trecho)
                continue
        linhas.append([trecho])

    return [" ".join(t["texto"] for t in sorted(linha, key=lambda t: t["x"]))
            for linha in linhas]


def corrigir_confusoes(texto):
    def corrigir_palavra(match):
        palavra = match.group(0)
        if re.search(r"[A-Za-zÀ-ÿ]", palavra):
            return palavra.translate(TROCAS_EM_PALAVRAS)
        return palavra

    texto = re.sub(r"\S+", corrigir_palavra, texto)
    texto = re.sub(r"\s+", " ", texto).strip()

    maiusculas = sum(1 for c in texto if c.isupper())
    minusculas = sum(1 for c in texto if c.islower())
    if maiusculas > minusculas:
        texto = texto.upper()
    return texto


def transcrever_easyocr(imagem_tratada):
    resultados = obter_leitor().readtext(imagem_tratada, **PARAMETROS_OCR)
    linhas = organizar_em_linhas(resultados)
    return "\n".join(corrigir_confusoes(linha) for linha in linhas)


if __name__ == "__main__":
    imagem_entrada = sys.argv[1] if len(sys.argv) > 1 else "texto4.jpg"
    if not os.path.isabs(imagem_entrada):
        imagem_entrada = os.path.join(DIRETORIO_BASE, imagem_entrada)

    print("Tratando imagem...")
    imagem_limpa = tratar_quadro(
        imagem_entrada,
        salvar_em=os.path.join(DIRETORIO_BASE, "foto_quadro_processado.jpg"))

    print("Extraindo texto com EasyOCR...")
    texto = transcrever_easyocr(imagem_limpa)

    print("\n--- TEXTO EXTRAÍDO ---")
    print(texto)
