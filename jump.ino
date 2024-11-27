const int soundSensorPin = A0;  
const int threshold = 950;       
const int debounceDelay = 200;   
unsigned long lastJumpTime = 0;
  

void setup() {
  Serial.begin(9600);            
  pinMode(soundSensorPin, INPUT);
}

void loop() {
  int soundLevel = analogRead(soundSensorPin);  
  unsigned long currentTime = millis();        

  
  if (soundLevel > threshold && (currentTime - lastJumpTime) > debounceDelay) {
    Serial.println("jump");      
    lastJumpTime = currentTime;  
  }
}
