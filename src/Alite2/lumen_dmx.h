#ifndef __LUMEN_DMX_H_
#define __LUMEN_DMX_H_

#include <stddef.h>
#include <stdint.h>
#include "driver/uart.h"

#pragma once

// DMX512 definitions
#define DMX_START_CODE          0x00               // standard DMX start code
#define LUMEN_DMX_MAX_SLOTS     513                // 1 start code + 512 channels

int lumen_dmx_init(uart_port_t port, int rxPin, int txPin, int enPin);
bool lumen_dmx_process();                         // call periodically, e.g. from loop()
size_t lumen_dmx_copy_frame(uint8_t* dst, uint16_t addr, size_t dstSize);  // copy the received frame
void lumen_dmx_deinit(void);

#endif
