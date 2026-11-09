#include <ESP32Servo.h>
#include <string.h>

Servo servoA;
Servo servoB;
Servo servoC;

// Pinos físicos escolhidos: 27, 25 e 32 (mesmo lado, não consecutivos e seguros para saída)
const int PINO_SERVO_A = 27;
const int PINO_SERVO_B = 25;
const int PINO_SERVO_C = 32;

// Constantes globais
int pos_x = 90;
int pos_y = 0;

// Posições atuais reais dos servos (Servo A inicia em 90)
int servoA_atual = 90;
int servoB_atual = 0;
int servoC_atual = 50; 

const int TEMPO_PAUSA = 1000;         

void setup() {
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  servoA.setPeriodHertz(50);
  servoB.setPeriodHertz(50);
  servoC.setPeriodHertz(50);

  servoA.attach(PINO_SERVO_A, 500, 2400);
  servoB.attach(PINO_SERVO_B, 500, 2400);
  servoC.attach(PINO_SERVO_C, 500, 2400);

  // Inicia todos nas posições iniciais
  servoA.write(servoA_atual);
  servoB.write(servoB_atual);
  servoC.write(servoC_atual);
  
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 pronto. Aguardando comando (ex: 09025)...");
}

void loop(){
  if (Serial.available() > 0) {
      String input = Serial.readStringUntil('\n');
      input.trim(); 

      // Garante que tem pelo menos 6 caracteres para ler os índices necessários
      if (input.length() >= 6) {
          
          // --- 1. Extrai o pos_x dos 3 primeiros dígitos (índices 0, 1, 2) ---
          int x_lido = (input[0] - '0') * 100 + (input[1] - '0') * 10 + (input[2] - '0');
          pos_x = (x_lido > 180) ? 180 : x_lido; // Trava no máximo 180

          // --- 2. Extrai o pos_y dos 2 dígitos seguintes (índices 4 e 5, pulando o 3) ---
          int y_lido = (input[4] - '0') * 10 + (input[5] - '0');
          pos_y = (y_lido > 50) ? 50 : y_lido;   // Trava no máximo 50

          Serial.print("Movendo para -> pos_x: ");
          Serial.print(pos_x);
          Serial.print(" | pos_y: ");
          Serial.println(pos_y);

          // --- 3. Movimento simultâneo de TODOS os eixos com sincronia de chegada ---
          int distA = abs(pos_x - servoA_atual);
          int distB = abs(pos_y - servoB_atual);
          
          int maxPassos = max(distA, distB);

          if (maxPassos > 0) {
              int inicioA = servoA_atual;
              int inicioB = servoB_atual;
              int alvoB = pos_y;

              for (int passo = 0; passo <= maxPassos; passo++) {
                  
                  // Eixo A (Servo A)
                  if (distA > 0) {
                      int valA = round(inicioA + (float)(pos_x - inicioA) * passo / maxPassos);
                      servoA.write(valA);
                  }

                  // Eixo B (Servo B e C invertido)
                  if (distB > 0) {
                      int valB = round(inicioB + (float)(alvoB - inicioB) * passo / maxPassos);
                      int valC = 50 - valB; // Invertido em relação a 50
                      
                      servoB.write(valB);
                      servoC.write(valC);
                  }

                  delay(20); // Velocidade do movimento sincronizado
              }
          }

          // Atualiza as posições atuais reais
          servoA_atual = pos_x;
          servoB_atual = pos_y;
          servoC_atual = 50 - pos_y;

          delay(TEMPO_PAUSA);

      } else {
          Serial.println("Erro: Comando muito curto.");
      }
  }
}