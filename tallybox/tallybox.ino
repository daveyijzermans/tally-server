#include <RGBDigitV2.h>
#define rgb_Blue 0x0000FF
#define rgb_Green 0x00FF00
#define rgb_Red 0xFF0000
#define rgb_White 0xFFFFFF
#define BUF_LENGTH 128

#define NDIGITS 4
RGBDigit digits(NDIGITS, 0);

uint8_t mode = 0; //0 = progress, 1 = show camNumber
unsigned long previousMillis = 0;
uint8_t brightness = 35;
bool pulse = false;
uint8_t camNumber = 0;
uint8_t j = 0;
uint32_t statusColor = rgb_White;

void setup()
{
  digits.begin();
  digits.clearAll();

  digits.setBrightness(brightness);

  Serial.setTimeout(150);
  Serial.begin(9600);;
}

void stepProgressBar()
{
  unsigned long currentMillis = millis();
  if(currentMillis - previousMillis <= 45) return;
  
  previousMillis = currentMillis;
    
  static byte progress[][2]{
    {B00000001,B00000000},
    {B00000000,B00000001},
    {B00000000,B00000010},
    {B00000000,B00000100},
    {B00000000,B00001000},
    {B00001000,B00000000},
    {B00010000,B00000000},
    {B00100000,B00000000}
//    {B00000001,B00000000},
//    {B00000010,B00000000},
//    {B00000000,B00010000},
//    {B00000000,B00001000},
//    {B00000000,B00000100},
//    {B00000000,B00000010},
//    {B00000000,B00000001},
//    {B00000000,B00100000},
//    {B00000100,B00000000},
//    {B00001000,B00000000},
//    {B00010000,B00000000},
//    {B00100000,B00000000}
  };
  
  static size_t progress_size = sizeof(progress) / sizeof(progress)[0];
  
  if(j >= progress_size) j = 0;
  
  uint32_t color = mode == 2 ? rgb_Red : rgb_Green;
  digits.setPattern(progress[j][0], 0, color);
  digits.setPattern(progress[j][1], 1, color);
  digits.setPattern(progress[j][0], 2, color);
  digits.setPattern(progress[j][1], 3, color);
  j++;
}

void parseCommand(char *cmdline)
{
  char *command = strsep(&cmdline, " ");
  uint8_t value = atoi(cmdline);
  if (strcmp(command, "mode") == 0) {
    mode = value;
  } else if (strcmp(command, "pulse") == 0) {
    pulse = value == 1;
  } else if (strcmp(command, "bright") == 0) {
    brightness = value;
    digits.setBrightness(brightness);
  } else if (strcmp(command, "status") == 0) {
    if(value == 1 || value == 3)
    {
      statusColor = rgb_Red;
    } else if(value == 2)
    {
      statusColor = rgb_Green;
    } else
    {
    statusColor = rgb_White;
    }
  } else if (strcmp(command, "cam") == 0)
  {
    if (value > 0 && value < 100) camNumber = value;
  } else {
      Serial.print(F("Error: Unknown command: "));
      Serial.println(command);
  }
}

void loop()
{
  while (Serial.available()) {
    static char buffer[BUF_LENGTH];
    static int length = 0;  // length of line received so far
    int data = Serial.read();
    if (data == '\n') {
      buffer[length] = '\0';     // properly terminate the string
      if (length) parseCommand(buffer);  // give to interpreter
      length = 0;                // reset for next command
    } else if (length < BUF_LENGTH - 1) {
      buffer[length++] = data;   // buffer the incoming byte
    }
  }

  if (mode == 0 || mode == 2) return stepProgressBar();
  if (mode == 1)
  {
    uint8_t first = (camNumber / 10) % 10;
    if (first == 0)
    {
      digits.setPattern(B01011000, 0, statusColor);
      digits.setPattern(B01011000, 2, statusColor);
    }
    else
    {
      digits.setDigit(first, 0, statusColor);
      digits.setDigit(first, 2, statusColor);
    }
    uint8_t single = camNumber % 10;
    digits.setDigit(single, 1, statusColor);
    digits.setDigit(single, 3, statusColor);
  }
}
