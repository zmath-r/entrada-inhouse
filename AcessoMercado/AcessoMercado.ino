#include <WiFi.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// Configurações de Rede (Wokwi usa rede virtual "Wokwi-GUEST")
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// URL do Backend
const char* backendValidateUrl = "http://192.168.18.14:3000/api/tokens/validate";
const char* backendPingUrl     = "http://192.168.18.14:3000/api/hardware/ping";
const char* backendEmergUrl    = "http://192.168.18.14:3000/api/hardware/emergency";
const char* backendExitUrl     = "http://192.168.18.14:3000/api/access/exit";

// Pinos de Hardware
#define PIN_LOCK       2  // LED Verde / Eletroímã
#define PIN_DENIED     4  // LED Vermelho
#define PIN_BUZZER     15 // Alarme Sonoro
#define PIN_EMERGENCY  5  // Botão de Emergência
#define PIN_EXIT_BUTTON 18 // Botoeira No-Touch de Saída Livre (Fail-Safe)

// Display LCD I2C (Endereço 0x27)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Estados da FSM
enum SystemState {
  STATE_IDLE,
  STATE_VALIDATING,
  STATE_GRANTED,
  STATE_DENIED,
  STATE_EMERGENCY
};

SystemState currentState = STATE_IDLE;
unsigned long stateTimer = 0;
const unsigned long GRANTED_DURATION = 5000; // Porta aberta por 5s
const unsigned long DENIED_DURATION = 3000;  // Aviso de negado por 3s

// Sprint 2: Telemetria (Ping)
unsigned long lastPingTimer = 0;
const unsigned long PING_INTERVAL = 180000; // 3 minutos

// Sprint 2: Emergência
bool emergencyReported = false;

// Sprint 2: Tokens Mestres Offline
const String MASTER_TOKENS[] = {"MASTER-1234", "MASTER-9999", "SINDICO-ABC"};
const int NUM_MASTER_TOKENS = 3;

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_LOCK, OUTPUT);
  pinMode(PIN_DENIED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_EMERGENCY, INPUT_PULLUP);
  pinMode(PIN_EXIT_BUTTON, INPUT_PULLUP);
  
  digitalWrite(PIN_LOCK, LOW);
  digitalWrite(PIN_DENIED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  lcd.init();
  lcd.backlight();
  updateDisplay("SmartCondo", "Iniciando...");

  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) { // Timeout de 5s para não travar 100%
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Conectado!");
    updateDisplay("Aguardando", "Leitura QR Code");
    sendPing(); // Envia o primeiro ping de boot
  } else {
    Serial.println("\nFalha no WiFi. Iniciando OFFLINE.");
    updateDisplay("MODO OFFLINE", "Apenas Mestres");
  }
  
  tone(PIN_BUZZER, 1000, 200); delay(250); tone(PIN_BUZZER, 2000, 200);
}

void triggerExit() {
  currentState = STATE_GRANTED;
  stateTimer = millis();
  digitalWrite(PIN_LOCK, HIGH); // Destrava fechadura / relé
  digitalWrite(PIN_DENIED, LOW);
  updateDisplay("SAIDA LIBERADA", "ATE BREVE!");
  Serial.println("SAIDA: Botoeira No-Touch acionada. Porta destravada.");
  tone(PIN_BUZZER, 1500, 200);

  if (WiFi.status() == WL_CONNECTED) {
    sendPostRequest(backendExitUrl, "{\"method\":\"NO_TOUCH_SENSOR\"}");
  }
}

void loop() {
  // 1. Checa Emergência imediatamente (maior prioridade)
  if (digitalRead(PIN_EMERGENCY) == LOW) {
    if (currentState != STATE_EMERGENCY) {
      currentState = STATE_EMERGENCY;
      updateDisplay("EMERGENCIA!", "PORTA DESTRAVADA");
      digitalWrite(PIN_LOCK, HIGH); // Destrava
      digitalWrite(PIN_DENIED, LOW);
      Serial.println("MODO DE EMERGENCIA ATIVADO!");
      
      // Envia requisição POST avisando do pânico apenas 1x
      if (!emergencyReported && WiFi.status() == WL_CONNECTED) {
        sendPostRequest(backendEmergUrl, "{}");
        emergencyReported = true;
      }
    }
  }

  // 2. Checa Botoeira No-Touch de Saída Livre (Desimpedida / Fail-Safe)
  if (currentState == STATE_IDLE && digitalRead(PIN_EXIT_BUTTON) == LOW) {
    triggerExit();
  }

  // Máquina de Estados Não-Bloqueante
  switch (currentState) {
    
    case STATE_IDLE:
      if (Serial.available() > 0) {
        String token = Serial.readStringUntil('\n');
        token.trim();
        if (token.equalsIgnoreCase("SAIDA") || token.equalsIgnoreCase("EXIT")) {
          triggerExit();
        } else if (token.length() > 0) {
          validateToken(token);
        }
      }

      // Heartbeat Ping (a cada 3 min)
      if (millis() - lastPingTimer >= PING_INTERVAL) {
        lastPingTimer = millis();
        if (WiFi.status() == WL_CONNECTED) {
          sendPing();
        }
      }
      break;
      
    case STATE_VALIDATING:
      break;
      
    case STATE_GRANTED:
      if (millis() - stateTimer >= GRANTED_DURATION) {
        digitalWrite(PIN_LOCK, LOW);
        resetToIdle();
      }
      break;
      
    case STATE_DENIED:
      if (millis() - stateTimer >= DENIED_DURATION) {
        digitalWrite(PIN_DENIED, LOW);
        resetToIdle();
      }
      break;
      
    case STATE_EMERGENCY:
      if ((millis() / 500) % 2 == 0) {
        tone(PIN_BUZZER, 1500, 250);
      }
      if (digitalRead(PIN_EMERGENCY) == HIGH) {
        noTone(PIN_BUZZER);
        digitalWrite(PIN_LOCK, LOW);
        emergencyReported = false; // Reseta flag para a próxima ocorrência
        Serial.println("Emergencia desativada.");
        resetToIdle();
      }
      break;
  }
}

void resetToIdle() {
  currentState = STATE_IDLE;
  if (WiFi.status() == WL_CONNECTED) {
    updateDisplay("Aguardando", "Leitura QR Code");
  } else {
    updateDisplay("MODO OFFLINE", "Apenas Mestres");
  }
}

void validateToken(String rawToken) {
  // Higieniza o token removendo quebras de linha (\r, \n), caracteres de controle e códigos ANSI
  String token = "";
  for (unsigned int i = 0; i < rawToken.length(); i++) {
    char c = rawToken.charAt(i);
    if (isalnum(c) || c == '-' || c == '_') {
      token += c;
    }
  }
  token.trim();

  if (token.length() == 0) {
    Serial.println("Aviso: Entrada vazia ignorada.");
    return;
  }

  Serial.println("Validando Token: [" + token + "]");
  currentState = STATE_VALIDATING;
  updateDisplay("Validando...", token.substring(0, 16));
  
  if (WiFi.status() == WL_CONNECTED) {
    // Validação ONLINE
    StaticJsonDocument<256> doc;
    doc["token"] = token;
    String requestBody;
    serializeJson(doc, requestBody);
    
    HTTPClient http;
    http.begin(backendValidateUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      StaticJsonDocument<512> responseDoc;
      DeserializationError err = deserializeJson(responseDoc, response);
      
      if (!err && responseDoc.containsKey("status")) {
        String status = responseDoc["status"].as<String>();
        
        if (status == "GRANTED") {
          String apto = responseDoc.containsKey("apartment") ? responseDoc["apartment"].as<String>() : "OK";
          String msg = responseDoc.containsKey("message") ? responseDoc["message"].as<String>() : "Liberado";
          updateDisplay("ACESSO LIBERADO", apto);
          digitalWrite(PIN_LOCK, HIGH);
          tone(PIN_BUZZER, 2000, 300);
          currentState = STATE_GRANTED;
          stateTimer = millis();
          Serial.println("Acesso Liberado: " + msg + " (Apto " + apto + ")");
        } else {
          String msg = responseDoc.containsKey("message") ? responseDoc["message"].as<String>() : "Recusado";
          updateDisplay("ACESSO NEGADO", msg.substring(0, 16));
          digitalWrite(PIN_DENIED, HIGH);
          tone(PIN_BUZZER, 500, 1000);
          currentState = STATE_DENIED;
          stateTimer = millis();
          Serial.println("Acesso Negado: " + msg);
        }
      } else {
        Serial.print("Erro ao interpretar resposta do servidor: ");
        Serial.println(err ? err.c_str() : "JSON sem campo status");
        Serial.println("Corpo recebido: " + response);
        updateDisplay("Erro de Resposta", "Servidor Invalido");
        digitalWrite(PIN_DENIED, HIGH);
        currentState = STATE_DENIED;
        stateTimer = millis();
      }
    } else {
      Serial.print("Erro HTTP: ");
      Serial.println(httpResponseCode);
      updateDisplay("Erro de Rede", "Tente Novamente");
      digitalWrite(PIN_DENIED, HIGH);
      currentState = STATE_DENIED;
      stateTimer = millis();
    }
    http.end();
  } else {
    // Validação OFFLINE (Fallback)
    bool isMaster = false;
    for (int i = 0; i < NUM_MASTER_TOKENS; i++) {
      if (token == MASTER_TOKENS[i]) {
        isMaster = true;
        break;
      }
    }

    if (isMaster) {
      updateDisplay("OFFLINE ACESSO", "Master Local");
      digitalWrite(PIN_LOCK, HIGH);
      tone(PIN_BUZZER, 2000, 300);
      currentState = STATE_GRANTED;
      stateTimer = millis();
      Serial.println("Acesso Mestre Local Liberado!");
    } else {
      updateDisplay("OFFLINE NEGADO", "Token Invalido");
      digitalWrite(PIN_DENIED, HIGH);
      tone(PIN_BUZZER, 500, 1000);
      currentState = STATE_DENIED;
      stateTimer = millis();
      Serial.println("Acesso Local Negado.");
    }
  }
}

void sendPing() {
  Serial.println("Enviando Heartbeat (Ping)...");
  sendPostRequest(backendPingUrl, "{\"status\":\"ONLINE\"}");
}

// Função utilitária para envios rápidos que não esperam retorno longo
void sendPostRequest(const char* url, String payload) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  http.end();
}

void updateDisplay(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

// FORCE COMPILE: BREAK CACHE
