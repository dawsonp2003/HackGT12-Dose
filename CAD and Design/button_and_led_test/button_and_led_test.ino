// Pin assignments
const int LED_PIN = 2;
const int BUTTON_PIN = 4;

// Variables for breathing effect
int brightness = 0;         // LED brightness (0–255)
int fadeAmount = 5;         // Amount to change brightness each step
unsigned long previousMillis = 0;
const int fadeInterval = 30; // Time between brightness changes (ms)

// State tracking
bool ledSolid = false;
bool lastButtonState = HIGH;
bool buttonPressed = false;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP); // Button to GND, internal pull-up
}

void loop() {
  // --- Handle button press with simple debounce ---
  bool buttonState = digitalRead(BUTTON_PIN);
  if (buttonState == LOW && lastButtonState == HIGH) {
    // Button just pressed
    buttonPressed = true;
  }
  lastButtonState = buttonState;

  if (buttonPressed) {
    ledSolid = !ledSolid; // Toggle mode
    buttonPressed = false;
  }

  // --- LED behavior ---
  if (ledSolid) {
    analogWrite(LED_PIN, 255); // Fully on
  } else {
    // Breathing effect
    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= fadeInterval) {
      previousMillis = currentMillis;
      brightness += fadeAmount;

      // Reverse fade direction at limits
      if (brightness <= 0 || brightness >= 255) {
        fadeAmount = -fadeAmount;
      }
      analogWrite(LED_PIN, brightness);
    }
  }
}
