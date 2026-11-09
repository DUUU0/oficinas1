#include <ESP32Servo.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

Servo servoA;  // Pan
Servo servoB;  // Tilt
Servo servoC;  // Tilt espelhado

const int PINO_SERVO_A = 27;
const int PINO_SERVO_B = 25;
const int PINO_SERVO_C = 32;

const int PULSO_MIN_US = 500;
const int PULSO_MAX_US = 2400;

const float PAN_MIN = 0, PAN_MAX = 180;
const float TILT_MIN = 0, TILT_MAX = 50;

// Se a câmera fugir do rosto, troque o sinal do eixo errado.
const float SINAL_PAN = -1.0;
const float SINAL_TILT = 1.0;

const float FOV_HORIZONTAL = 70.0;
const float FOV_VERTICAL = 43.0;

// Saída em graus/s. Tremendo: diminua KP. Lento para alcançar: aumente KP.
const float KP = 0.8;
const float KI = 0.05;
const float KD = 0.0;
const float LIMITE_INTEGRAL = 5.0;
const float ALFA_FILTRO = 0.4;

// O eixo só parte acima de ZONA_PARTIDA; ao centralizar, fica parado por PAUSA_CENTRALIZADO_MS.
const float ZONA_PARTIDA_GRAUS = 5.0;
const float ZONA_PARADA_GRAUS = 1.5;
const unsigned long PAUSA_CENTRALIZADO_MS = 600;

const float VEL_MAX_TRAVADO = 20.0;
const float ACELERACAO_MAX = 60.0;

const float BUSCA_PANS[] = { 20, 55, 90, 125, 160 };
const float BUSCA_TILTS[] = { 15, 35 };
const int QTD_PANS = sizeof(BUSCA_PANS) / sizeof(BUSCA_PANS[0]);
const int QTD_TILTS = sizeof(BUSCA_TILTS) / sizeof(BUSCA_TILTS[0]);
const float VEL_BUSCA = 20.0;
const float GANHO_POSICAO = 4.0;
const float TOLERANCIA_PONTO = 1.0;
const unsigned long PAUSA_BUSCA_MS = 800;

const unsigned long TICK_MS = 20;
const unsigned long MEDIDA_VALIDA_MS = 300;
const unsigned long TIMEOUT_PC_MS = 2000;

enum Estado { ESPERANDO_PC, BUSCANDO, TRAVADO, MANUAL };
Estado estado = ESPERANDO_PC;

struct Eixo {
  float posicao;
  float velocidade;
  float velocidadeAlvo;
  float minimo;
  float maximo;
  float integral;
  float erroAnterior;
  float erroFiltrado;
  bool seguindo;
  unsigned long pausaAteMs;
};

Eixo pan = { 90, 0, 0, PAN_MIN, PAN_MAX, 0, 0, 0, false, 0 };
Eixo tilt = { 25, 0, 0, TILT_MIN, TILT_MAX, 0, 0, 0, false, 0 };

bool temMedidaAnterior = false;
unsigned long ultimaMedidaMs = 0;
unsigned long ultimaMensagemMs = 0;
unsigned long ultimoTickMs = 0;

int indicePan = 0;
int indiceTilt = 0;
int sentidoBusca = 1;
int ultimoSentidoAlvo = 1;
bool pausadoNoPonto = false;
unsigned long fimPausaMs = 0;

float manualPan = 90;
float manualTilt = 25;

char buffer[32];
int tamanhoBuffer = 0;

const char *nomeEstado(Estado e) {
  switch (e) {
    case ESPERANDO_PC: return "AGUARDANDO PC";
    case BUSCANDO: return "BUSCANDO";
    case TRAVADO: return "TRAVADO";
    case MANUAL: return "MANUAL";
  }
  return "?";
}

void zerarPID() {
  pan.integral = tilt.integral = 0;
  pan.erroAnterior = tilt.erroAnterior = 0;
  temMedidaAnterior = false;
}

void pararEixos() {
  pan.velocidadeAlvo = 0;
  tilt.velocidadeAlvo = 0;
}

void prepararBusca() {
  sentidoBusca = ultimoSentidoAlvo;

  indicePan = (sentidoBusca > 0) ? QTD_PANS - 1 : 0;
  for (int i = 0; i < QTD_PANS; i++) {
    int candidato = (sentidoBusca > 0) ? i : QTD_PANS - 1 - i;
    if ((BUSCA_PANS[candidato] - pan.posicao) * sentidoBusca > 0) {
      indicePan = candidato;
      break;
    }
  }
  pausadoNoPonto = false;
}

void mudarEstado(Estado novo) {
  if (novo == estado) return;
  if (novo == BUSCANDO) prepararBusca();
  if (novo != TRAVADO) zerarPID();
  pararEixos();
  estado = novo;
  Serial.println(nomeEstado(novo));
}

float calcularPID(Eixo &eixo, float erroMedido, float dt, bool primeira, unsigned long agora) {
  eixo.erroFiltrado = primeira ? erroMedido : eixo.erroFiltrado + ALFA_FILTRO * (erroMedido - eixo.erroFiltrado);
  float erro = eixo.erroFiltrado;

  if (eixo.seguindo && fabs(erro) < ZONA_PARADA_GRAUS) {
    eixo.seguindo = false;
    eixo.integral = 0;
    eixo.pausaAteMs = agora + PAUSA_CENTRALIZADO_MS;
  }
  if (!eixo.seguindo && fabs(erro) >= ZONA_PARTIDA_GRAUS && (long)(agora - eixo.pausaAteMs) >= 0) {
    eixo.seguindo = true;
  }
  if (!eixo.seguindo) {
    eixo.erroAnterior = erro;
    return 0;
  }

  eixo.integral = constrain(eixo.integral + erro * dt, -LIMITE_INTEGRAL, LIMITE_INTEGRAL);
  float derivada = primeira ? 0 : (erro - eixo.erroAnterior) / dt;
  eixo.erroAnterior = erro;

  return KP * erro + KI * eixo.integral + KD * derivada;
}

void receberMedida(int erroX, int erroY, unsigned long agora) {
  mudarEstado(TRAVADO);

  float dt = constrain((agora - ultimaMedidaMs) / 1000.0, 0.02, 0.25);
  float erroPan = constrain(erroX, -1000, 1000) / 1000.0 * (FOV_HORIZONTAL / 2.0);
  float erroTilt = constrain(erroY, -1000, 1000) / 1000.0 * (FOV_VERTICAL / 2.0);

  if (fabs(erroPan) >= ZONA_PARADA_GRAUS) {
    ultimoSentidoAlvo = (SINAL_PAN * erroPan > 0) ? 1 : -1;
  }

  float saidaPan = calcularPID(pan, erroPan, dt, !temMedidaAnterior, agora);
  float saidaTilt = calcularPID(tilt, erroTilt, dt, !temMedidaAnterior, agora);
  temMedidaAnterior = true;
  ultimaMedidaMs = agora;

  pan.velocidadeAlvo = constrain(SINAL_PAN * saidaPan, -VEL_MAX_TRAVADO, VEL_MAX_TRAVADO);
  tilt.velocidadeAlvo = constrain(SINAL_TILT * saidaTilt, -VEL_MAX_TRAVADO, VEL_MAX_TRAVADO);
}

void processarMensagem(const char *mensagem, unsigned long agora) {
  int a, b;

  if (mensagem[0] == 'T' && sscanf(mensagem, "T,%d,%d", &a, &b) == 2) {
    ultimaMensagemMs = agora;
    receberMedida(a, b, agora);
  } else if (strcmp(mensagem, "H") == 0) {
    ultimaMensagemMs = agora;
    mudarEstado(TRAVADO);
    zerarPID();
    pararEixos();
  } else if (strcmp(mensagem, "N") == 0) {
    ultimaMensagemMs = agora;
    mudarEstado(BUSCANDO);
  } else if (sscanf(mensagem, "%d,%d", &a, &b) == 2) {
    manualPan = constrain(a, PAN_MIN, PAN_MAX);
    manualTilt = constrain(b, TILT_MIN, TILT_MAX);
    mudarEstado(MANUAL);
    Serial.print("Movendo para -> pan: ");
    Serial.print(manualPan, 0);
    Serial.print(" | tilt: ");
    Serial.println(manualTilt, 0);
  } else {
    Serial.println("Comando desconhecido.");
  }
}

// Não usa readStringUntil porque ele travaria o movimento enquanto espera a linha
void lerSerial(unsigned long agora) {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\r') continue;

    if (c == '\n') {
      buffer[tamanhoBuffer] = '\0';
      if (tamanhoBuffer > 0) processarMensagem(buffer, agora);
      tamanhoBuffer = 0;
    } else if (tamanhoBuffer < (int)sizeof(buffer) - 1) {
      buffer[tamanhoBuffer++] = c;
    }
  }
}

void irParaPonto(float pontoPan, float pontoTilt, float velocidade) {
  pan.velocidadeAlvo = constrain((pontoPan - pan.posicao) * GANHO_POSICAO, -velocidade, velocidade);
  tilt.velocidadeAlvo = constrain((pontoTilt - tilt.posicao) * GANHO_POSICAO, -velocidade, velocidade);
}

void avancarPontoBusca() {
  int proximo = indicePan + sentidoBusca;
  if (proximo < 0 || proximo >= QTD_PANS) {
    sentidoBusca = -sentidoBusca;
    indiceTilt = (indiceTilt + 1) % QTD_TILTS;
  } else {
    indicePan = proximo;
  }
}

void atualizarBusca(unsigned long agora) {
  if (pausadoNoPonto) {
    pararEixos();
    if ((long)(agora - fimPausaMs) >= 0) {
      pausadoNoPonto = false;
      avancarPontoBusca();
    }
    return;
  }

  float pontoPan = BUSCA_PANS[indicePan];
  float pontoTilt = BUSCA_TILTS[indiceTilt];

  if (fabs(pontoPan - pan.posicao) <= TOLERANCIA_PONTO && fabs(pontoTilt - tilt.posicao) <= TOLERANCIA_PONTO) {
    pausadoNoPonto = true;
    fimPausaMs = agora + PAUSA_BUSCA_MS;
    pararEixos();
    return;
  }

  irParaPonto(pontoPan, pontoTilt, VEL_BUSCA);
}

void moverEixo(Eixo &eixo, float dt) {
  float variacaoMax = ACELERACAO_MAX * dt;
  eixo.velocidade += constrain(eixo.velocidadeAlvo - eixo.velocidade, -variacaoMax, variacaoMax);
  eixo.posicao += eixo.velocidade * dt;

  if (eixo.posicao <= eixo.minimo || eixo.posicao >= eixo.maximo) {
    eixo.posicao = constrain(eixo.posicao, eixo.minimo, eixo.maximo);
    eixo.velocidade = 0;
    eixo.integral = 0;
  }
}

int grausParaPulso(float graus) {
  return (int)lround(PULSO_MIN_US + graus * (PULSO_MAX_US - PULSO_MIN_US) / 180.0);
}

void escreverServos() {
  servoA.writeMicroseconds(grausParaPulso(pan.posicao));
  servoB.writeMicroseconds(grausParaPulso(tilt.posicao));
  servoC.writeMicroseconds(grausParaPulso(TILT_MAX - tilt.posicao));
}

void setup() {
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servoA.setPeriodHertz(50);
  servoB.setPeriodHertz(50);
  servoC.setPeriodHertz(50);

  servoA.attach(PINO_SERVO_A, PULSO_MIN_US, PULSO_MAX_US);
  servoB.attach(PINO_SERVO_B, PULSO_MIN_US, PULSO_MAX_US);
  servoC.attach(PINO_SERVO_C, PULSO_MIN_US, PULSO_MAX_US);
  escreverServos();

  Serial.begin(115200);
  delay(500);

  Serial.println("ESP32 pronto.");
  Serial.println(nomeEstado(estado));
  ultimoTickMs = millis();
}

void loop() {
  unsigned long agora = millis();
  lerSerial(agora);

  if (agora - ultimoTickMs < TICK_MS) return;
  float dt = (agora - ultimoTickMs) / 1000.0;
  ultimoTickMs = agora;

  bool estadoComandadoPeloPC = (estado == BUSCANDO || estado == TRAVADO);
  if (estadoComandadoPeloPC && agora - ultimaMensagemMs > TIMEOUT_PC_MS) {
    mudarEstado(ESPERANDO_PC);
  }

  switch (estado) {
    case BUSCANDO:
      atualizarBusca(agora);
      break;
    case TRAVADO:
      if (agora - ultimaMedidaMs > MEDIDA_VALIDA_MS) pararEixos();
      break;
    case MANUAL:
      irParaPonto(manualPan, manualTilt, VEL_BUSCA);
      break;
    case ESPERANDO_PC:
      pararEixos();
      break;
  }

  moverEixo(pan, dt);
  moverEixo(tilt, dt);
  escreverServos();
}
