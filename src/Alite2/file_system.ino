#include <LittleFS.h>
#include "common.h"

/*
LittleFS upload tool (optional)
-> needed to upload files to LittleFS

Download from GitHub:

https://github.com/lorol/arduino-esp32fs-plugin

Install:

copy ESP32FS.jar to
Windows: C:\Users\YourName\Documents\Arduino\tools\ESP32FS\tool\ESP32FS.jar
macOS/Linux: ~/Documents/Arduino/tools/ESP32FS/tool/ESP32FS.jar

restart the Arduino IDE
-> Tools > ESP32 LittleFS Data Upload
*/
bool fs_mounted = false;

void init_fs(void)
{
    fs_mounted = LittleFS.begin(true);
    if (!fs_mounted) //When the file system is not ready, WDT reset error can be happened because it try to wdt_reset after file format
    {
        dbg.println("LittleFS Mount Failed");

        delay(1000);
        esp_restart();
    }
    else
    {
        dbg.println("LittleFS Mounted");
        /*
        File file = LittleFS.open("/log.txt", "w");  // overwrite an existing file
        if (!file) 
        {
            dbg.println("Failed to open file for writing");
            return;
        }
        file.println("ESP32 started");
        file.println("Log entry 1");
        file.print("Current millis: ");
        file.println(millis());

        file.close();
        dbg.println("File written successfully");      
        */
    }
}