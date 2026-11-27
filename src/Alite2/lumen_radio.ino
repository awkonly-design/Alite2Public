#include "common.h"
extern "C" {
    #include "lumen_dmx.h"
}

// DMX512 port and data buffer
uint8_t dmx_data[MAX_ARTNET_BUFF * sizeof(uint16_t)];//prepare 16bits mode
bool lumen_detected = false;


bool detect_lumen_module(void) {
    // detect the module through the link pin
    pinMode(LUMEN_LINK_PIN, INPUT_PULLDOWN);
    delay(10);  // short settling delay
    int linkStatus = digitalRead(LUMEN_LINK_PIN);

    pinMode(LUMEN_LINK_PIN, OUTPUT);
    digitalWrite(LUMEN_LINK_PIN, HIGH);

    return (linkStatus == HIGH);  // HIGH means the module is present
}

void reset_lumen_link(void) {
    dbg.println("Resetting Lumen Radio link...");
    pinMode(LUMEN_LINK_PIN, OUTPUT);
    digitalWrite(LUMEN_LINK_PIN, LOW);
}

static uint16_t lumen_last_status = 0;
bool lumen_is_connected(void) {// use only for the status icon: unreliable while the LED blinks
    return (lumen_last_status > 10000);
}


// LumenRadio init
void init_lumen() {
    dbg.println("Initializing Lumen Radio DMX receiver...");
    lumen_detected = detect_lumen_module();

    if (lumen_detected == false) {
        dbg.println("No Lumen Radio module detected.");
        return;
    }
    
    // prepare the LumenRadio hardware: status pin input, link pin driven HIGH to keep the module on
    pinMode(LUMEN_STATUS_PIN, INPUT_PULLUP);
    dbg.printf("Lumen Radio DMX receiver %d\n", lumen_dmx_init(UART_NUM_1, LUMEN_RX_PIN, LUMEN_TX_PIN, -1));
}

void monitor_lumen_connection(void) {
    if (digitalRead(LUMEN_STATUS_PIN) == HIGH)
    {
        if (lumen_last_status < 0xFFFF)
            lumen_last_status++;
    }
    else
        lumen_last_status = 0;
}

void lumen_process(void) {
    if (lumen_detected == false)
        return;

    monitor_lumen_connection();

    if (lumen_dmx_process()) {
        size_t len = lumen_dmx_copy_frame(dmx_data, param.dmx_ch, MAX_ARTNET_BUFF * sizeof(uint16_t));
        set_dmx512_pwm_callback(dmx_data, len);

        //dbg.printf("%d,%d,%d,%d,%d\r\n",len,dmx_data[0],dmx_data[1],dmx_data[2],dmx_data[3]);
    }
}