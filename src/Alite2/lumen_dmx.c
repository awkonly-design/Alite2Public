#include "lumen_dmx.h"

#include <string.h>
#include <esp_heap_caps.h>
#include <esp_intr_alloc.h>
#include <freertos/FreeRTOS.h>
#include <driver/uart.h>
#include <hal/uart_ll.h>
#include <soc/uart_periph.h>

static const uint32_t LUMEN_UART_INTR_MASK = UART_INTR_BRK_DET;

static uart_port_t g_port = UART_NUM_1;
static intr_handle_t g_uartIsrHandle = NULL;
static bool g_driverInstalled = false;

static uint8_t* g_bufferA = NULL;
static uint8_t* g_bufferB = NULL;
static uint8_t* g_activeBuffer = NULL;
static uint8_t* g_readyBuffer = NULL;

static size_t g_activeLength = 0;
static volatile bool g_frameReady = false;

//static portMUX_TYPE g_isrMux = portMUX_INITIALIZER_UNLOCKED;

static void free_buffers(void) {
    if (g_bufferA != NULL) {
        heap_caps_free(g_bufferA);
        g_bufferA = NULL;
    }
    if (g_bufferB != NULL) {
        heap_caps_free(g_bufferB);
        g_bufferB = NULL;
    }
    g_activeBuffer = NULL;
    g_readyBuffer = NULL;
}

static inline void swap_buffers(void) {
    uint8_t* tmp = g_readyBuffer;
    g_readyBuffer = g_activeBuffer;
    g_activeBuffer = tmp;
}

static void IRAM_ATTR lumen_uart_isr(void* arg) {
    uart_dev_t* dev = UART_LL_GET_HW(g_port);
    uint32_t intr_status = uart_ll_get_intsts_mask(dev);

    if (intr_status == 0) {
        return;
    }
    //portENTER_CRITICAL_ISR(&g_isrMux);

    if (intr_status & UART_INTR_BRK_DET) {
        if ((g_activeLength == LUMEN_DMX_MAX_SLOTS) && (g_activeBuffer[0] == DMX_START_CODE)) {
            swap_buffers();
            g_frameReady = true;
        }

        g_activeLength = 0;
        uart_ll_rxfifo_rst(dev);
    }
/*
    if (intr_status & (UART_INTR_PARITY_ERR | UART_INTR_FRAM_ERR | UART_INTR_RXFIFO_OVF)) {
        g_activeLength = 0;
        uart_ll_rxfifo_rst(dev);
    }
*/
    uart_ll_clr_intsts_mask(dev, intr_status);
    //portEXIT_CRITICAL_ISR(&g_isrMux);
}

int lumen_dmx_init(uart_port_t port, int rxPin, int txPin, int enPin) {
    if (g_driverInstalled) {
        return 0;
    }

    g_bufferA = (uint8_t*)heap_caps_malloc(LUMEN_DMX_MAX_SLOTS, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    g_bufferB = (uint8_t*)heap_caps_malloc(LUMEN_DMX_MAX_SLOTS, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    if (g_bufferA == NULL || g_bufferB == NULL) {
        free_buffers();
        return -1;
    }

    memset(g_bufferA, 0, LUMEN_DMX_MAX_SLOTS);
    memset(g_bufferB, 0, LUMEN_DMX_MAX_SLOTS);
    g_activeBuffer = g_bufferA;
    g_readyBuffer = g_bufferB;
    g_activeLength = 0;
    g_frameReady = false;

    uart_config_t cfg = {
        .baud_rate = 250000,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_2,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .rx_flow_ctrl_thresh = 0,
        .source_clk = UART_SCLK_APB
    };

    if (uart_param_config(port, &cfg) != ESP_OK) {
        free_buffers();
        return -2;
    }

    if (uart_set_pin(port, txPin, rxPin, enPin, -1) != ESP_OK) {
        free_buffers();
        return -3;
    }

    //uart_set_rx_timeout(port, 3);
    //uart_set_rx_full_threshold(port, 64);

    uart_ll_disable_intr_mask(UART_LL_GET_HW(port), UINT32_MAX);
    uart_ll_clr_intsts_mask(UART_LL_GET_HW(port), UINT32_MAX);
    uart_ll_rxfifo_rst(UART_LL_GET_HW(port));

    // UART interrupts are fixed to the low/medium priority group on ESP32-S3.
    const int intr_flags = ESP_INTR_FLAG_IRAM | ESP_INTR_FLAG_LOWMED | ESP_INTR_FLAG_SHARED;
    int intr_source = uart_periph_signal[port].irq;
    if (esp_intr_alloc(intr_source, intr_flags, lumen_uart_isr, NULL,
                       &g_uartIsrHandle) != ESP_OK) {
        free_buffers();
        return -5;
    }

    uart_ll_ena_intr_mask(UART_LL_GET_HW(port), LUMEN_UART_INTR_MASK);

    g_port = port;
    g_driverInstalled = true;
    return 0;
}

bool lumen_dmx_process(void) {
    uart_dev_t* dev = UART_LL_GET_HW(g_port);
    uint32_t available = 0;

    while (available = uart_ll_get_rxfifo_len(dev)) {
        size_t space = (g_activeLength < LUMEN_DMX_MAX_SLOTS)
                            ? (LUMEN_DMX_MAX_SLOTS - g_activeLength)
                            : 0;
        if (space > 0) {
            uint32_t to_read = available;
            if (to_read > space) {
                to_read = (uint32_t)space;
            }

            uart_ll_read_rxfifo(dev, g_activeBuffer + g_activeLength, to_read);
            g_activeLength += to_read;
        }
    }

    return g_frameReady;
}

size_t lumen_dmx_copy_frame(uint8_t* dst, uint16_t addr, size_t dstSize) {
    //portENTER_CRITICAL(&g_isrMux);
    if (g_frameReady) {
        memcpy(dst, &g_readyBuffer[addr], dstSize);
        g_frameReady = false;
    }
    //portEXIT_CRITICAL(&g_isrMux);
    return dstSize;
}

void lumen_dmx_deinit(void) {
    if (!g_driverInstalled) {
        return;
    }

    uart_ll_disable_intr_mask(UART_LL_GET_HW(g_port), LUMEN_UART_INTR_MASK);
    uart_ll_clr_intsts_mask(UART_LL_GET_HW(g_port), UINT32_MAX);
    if (g_uartIsrHandle != NULL) {
        esp_intr_free(g_uartIsrHandle);
        g_uartIsrHandle = NULL;
    }

    free_buffers();
    g_activeLength = 0;
    g_frameReady = false;
    g_driverInstalled = false;
}
