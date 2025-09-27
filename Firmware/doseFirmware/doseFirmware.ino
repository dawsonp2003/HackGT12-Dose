#include <WiFi.h>
#include "HX711.h"

// ===== WiFi Settings =====
const char* ssid = "BlipTracker";
const char* password = "stenella";

// ===== Server Settings =====
const char* host = "192.168.137.1"; // Laptop IP
const int port = 5005;

// ===== Sampling Settings =====
const unsigned long ts = 1000 / 100;  // 100 Hz sampling
const int bufferSize = 5;

// ===== Load Cell Settings =====
HX711 scale;
uint8_t dataPin = 8;
uint8_t clockPin = 9;

// ===== Global Variables =====
WiFiClient client;

long last_sample_time;
long nextPing;
long data_buffer[bufferSize] = {0};
int buffer_index = 0;
int state = 0;

// ===== Helper Functions =====
float calculateStandardDeviation(long data[], int size);
void tryConnect();
void sendData(const String &data);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Connecting to WiFi...");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");

  // Start load cell
  scale.begin(dataPin, clockPin);
  scale.set_offset(218602);
  scale.set_scale(17465.935547); // Calibrated scale factor

  last_sample_time = millis();
  nextPing = last_sample_time + 5000;

  tryConnect(); // Try to connect at startup
}

void loop() {
  // Ensure we stay connected
  if (!client.connected()) {
    Serial.println("⚠️  Lost connection. Reconnecting...");
    tryConnect();
  }

  // Sample load cell at 10 Hz
  if (millis() - last_sample_time >= ts) {
    last_sample_time = millis();

    float grams = scale.get_units(5); // float for precision
    data_buffer[buffer_index] = grams;
    buffer_index = (buffer_index + 1) % bufferSize;

    float std_dev = calculateStandardDeviation(data_buffer, bufferSize);
    Serial.printf("STD: %.3f g\n", std_dev);

    switch(state) {
      case 0:
        if (abs(std_dev) > .1) {
          state = 1;
        }
        break;
      case 1:
        if (abs(std_dev) < .1) {
          state = 0;
          sendData(String(grams, 3));
        }
        break;
    }
  }

  // Alive ping every 5s
  if (millis() > nextPing) {
    nextPing += 5000;
    sendData("Alive");
  }

  delay(1); // Keep WiFi background tasks happy
}

// ===== FUNCTIONS =====

void tryConnect() {
  Serial.printf("Connecting to %s:%d ...\n", host, port);
  if (client.connect(host, port)) {
    Serial.println("✅ Connected to server!");
  } else {
    Serial.println("❌ Failed to connect. Will retry...");
  }
}

void sendData(const String &data) {
  if (client.connected()) {
    client.println(data);
  } else {
    Serial.println("⚠️ Cannot send, not connected.");
  }
}

float calculateStandardDeviation(long data[], int size) {
  if (size == 0) return 0.0;
  long sum = 0;
  for (int i = 0; i < size; i++) sum += data[i];
  float mean = (float)sum / size;

  float variance = 0.0;
  for (int i = 0; i < size; i++) variance += pow((float)data[i] - mean, 2);
  return sqrt(variance / size);
}
