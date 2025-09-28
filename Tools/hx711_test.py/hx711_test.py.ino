#include <WiFi.h>
#include "HX711.h"

const char* ssid = "BlipTracker";
const char* password = "stenella";

const char* host = "192.168.137.1"; // change to your server IP
const int   port = 5005;

WiFiClient client;
HX711 scale;

// Adjust pins for your wiring
const uint8_t dataPin = 8;
const uint8_t clockPin = 9;

// Calibration values (replace with your real ones once working)
const long   OFFSET = 5927949;   // offset from tare
const double SCALE  = 200.0;     // guessed scale, tune later

void ensureConnected() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) delay(200);
  }
  if (WiFi.status() == WL_CONNECTED && !client.connected()) {
    client.connect(host, port);
  }
}

void sendLine(const String &s) {
  if (!client.connected()) ensureConnected();
  if (client.connected()) client.println(s);
}

void setup() {
  WiFi.begin(ssid, password);
  ensureConnected();

  scale.begin(dataPin, clockPin);

  delay(1000);
  scale.set_offset(OFFSET);
  scale.set_scale(SCALE);

  sendLine("STREAM_START");
}

void loop() {
  ensureConnected();

  static long last_raw = 0;
  static int same_count = 0;

  if (scale.is_ready()) {
    long raw = scale.read();
    double grams = (raw - OFFSET) / SCALE;

    // detect stuck readings
    if (raw == last_raw) {
      same_count++;
    } else {
      same_count = 0;
    }
    last_raw = raw;

    if (same_count > 200) {
      sendLine("SENSOR_STUCK");
      same_count = 0;
    }

    sendLine(String("RAW:") + raw + ",GRAMS:" + String(grams, 3));
  } else {
    sendLine("HX711_NOT_READY");
  }

  delay(200); // ~5 Hz stream
}
