//
//    FILE: HX_calibration.ino
//  AUTHOR: Rob Tillaart
// PURPOSE: HX711 calibration finder for offset and scale
//     URL: https://github.com/RobTillaart/HX711

#include <WiFi.h>
#include "HX711.h"

// ===== WiFi Settings =====
const char* ssid = "BlipTracker";
const char* password = "stenella";

// ===== Server Settings =====
const char* host = "192.168.137.1"; // Laptop IP
const int port = 5005;

void tryConnect();
void sendData(const String &data);

WiFiClient client;
HX711 myScale;

//  adjust pins if needed.
uint8_t dataPin = 8;
uint8_t clockPin = 9;


void setup()
{
  Serial.begin(115200);
  Serial.println();
  Serial.println(__FILE__);
  Serial.print("HX711_LIB_VERSION: ");
  Serial.println(HX711_LIB_VERSION);
  Serial.println();
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");

  myScale.begin(dataPin, clockPin);

  tryConnect(); // Try to connect at startup
}

void loop()
{
  calibrate();
}



void calibrate()
{
  sendData("\n\nCALIBRATION\n===========");
  sendData("remove all weight from the loadcell");
  delay(10000);

  sendData("Determine zero weight offset");
  //  average 20 measurements.
  myScale.tare(50);
  int32_t offset = myScale.get_offset();

  sendData("OFFSET: ");
  sendData(String(offset));

  sendData("place the 13g weight on the loadcell");
  delay(10000);
  myScale.calibrate_scale(13, 50);
  float scale = myScale.get_scale();

  sendData("SCALE:  ");
  sendData(String(scale, 6));

  sendData("\nuse scale.set_offset(");
  sendData(String(offset));
  sendData("); and scale.set_scale(");
  sendData(String(scale, 6));
  sendData(");");
  sendData("in the setup of your project");
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

//  -- END OF FILE --
