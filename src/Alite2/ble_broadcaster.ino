#include <common.h>
#include <BLEDevice.h>

extern "C" {
    #include "esp_gap_ble_api.h"
}

namespace {
const uint8_t kWirelessMagic0 = 'A';
const uint8_t kWirelessMagic1 = '2';
const uint8_t kWirelessProtoVersion = 1;
const uint16_t kWirelessCompanyId = 0xFFFF;
const uint8_t kWirelessChunkPayload = 16;
const uint8_t kWirelessMaxChunks = (sizeof(parametersType) + kWirelessChunkPayload - 1) / kWirelessChunkPayload;
const uint32_t kWirelessBroadcastIntervalMs = 50;

bool wireless_gap_cb_registered = false;
bool wireless_ble_initialized = false;
bool wireless_adv_busy = false;
bool wireless_scan_active = false;
bool wireless_scan_pending = false;

uint32_t wireless_last_tx = 0;
uint8_t wireless_tx_seq = 0;
uint8_t wireless_tx_chunk = 0;

uint8_t wireless_rx_seq = 0;
uint8_t wireless_rx_total = 0;
uint8_t wireless_rx_bitmap = 0;
uint8_t wireless_rx_buffer[sizeof(parametersType)];

esp_ble_adv_params_t wireless_adv_params = {
    .adv_int_min = 0x20,
    .adv_int_max = 0x40,
    .adv_type = ADV_TYPE_NONCONN_IND,
    .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
    .channel_map = ADV_CHNL_ALL,
    .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
};

esp_ble_scan_params_t wireless_scan_params = {
    .scan_type = BLE_SCAN_TYPE_PASSIVE,
    .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
    .scan_filter_policy = BLE_SCAN_FILTER_ALLOW_ALL,
    .scan_interval = 0x50,
    .scan_window = 0x30,
    .scan_duplicate = BLE_SCAN_DUPLICATE_DISABLE,
};

void wireless_reset_rx_state(uint8_t seq, uint8_t total_chunks)
{
    wireless_rx_seq = seq;
    wireless_rx_total = total_chunks;
    wireless_rx_bitmap = 0;
    memset(wireless_rx_buffer, 0x00, sizeof(wireless_rx_buffer));
}

bool wireless_extract_manufacturer_data(const uint8_t *data, uint8_t data_len, const uint8_t **out, uint8_t *out_len)
{
    uint8_t index = 0;
    while (index < data_len)
    {
        uint8_t field_len = data[index];
        if (field_len == 0) break;
        if ((index + field_len) >= data_len) break;

        uint8_t type = data[index + 1];
        if (type == ESP_BLE_AD_MANUFACTURER_SPECIFIC_TYPE)
        {
            *out = &data[index + 2];
            *out_len = field_len - 1;
            return true;
        }
        index += field_len + 1;
    }
    return false;
}

void wireless_handle_rx_chunk(const uint8_t *data, uint8_t len)
{
    if (len < 2 + 7) return;

    uint16_t company_id = data[0] | (static_cast<uint16_t>(data[1]) << 8);
    if (company_id != kWirelessCompanyId) return;

    const uint8_t *payload = data + 2;
    uint8_t payload_len = len - 2;

    if (payload_len < 7) return;
    if (payload[0] != kWirelessMagic0 || payload[1] != kWirelessMagic1) return;
    if (payload[2] != kWirelessProtoVersion) return;

    uint8_t total_chunks = payload[3];
    uint8_t chunk_index = payload[4];
    uint8_t seq = payload[5];
    uint8_t data_len = payload[6];

    if (total_chunks == 0 || total_chunks > kWirelessMaxChunks) return;
    if (chunk_index >= total_chunks) return;
    if (data_len > kWirelessChunkPayload) return;
    if ((7 + data_len) > payload_len) return;

    if (seq != wireless_rx_seq || total_chunks != wireless_rx_total)
    {
        wireless_reset_rx_state(seq, total_chunks);
    }

    size_t offset = static_cast<size_t>(chunk_index) * kWirelessChunkPayload;
    if ((offset + data_len) > sizeof(wireless_rx_buffer)) return;

    memcpy(&wireless_rx_buffer[offset], &payload[7], data_len);
    wireless_rx_bitmap |= (1U << chunk_index);

    uint8_t expected_bitmap = (1U << total_chunks) - 1;
    if (wireless_rx_bitmap == expected_bitmap)
    {
        parametersType incoming;
        memcpy(&incoming, wireless_rx_buffer, sizeof(parametersType));
        if ((incoming.dmx_ch == param.dmx_ch) && (incoming.universe == param.universe))
        {
            memcpy(&param, &incoming, sizeof(parametersType));
        }
    }
}

void wireless_gap_event_handler(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *gap_param)
{
    switch (event)
    {
        case ESP_GAP_BLE_ADV_DATA_RAW_SET_COMPLETE_EVT:
            esp_ble_gap_start_advertising(&wireless_adv_params);
            wireless_adv_busy = false;
            break;
        case ESP_GAP_BLE_SCAN_PARAM_SET_COMPLETE_EVT:
            esp_ble_gap_start_scanning(0);
            wireless_scan_active = true;
            wireless_scan_pending = false;
            break;
        case ESP_GAP_BLE_SCAN_RESULT_EVT:
            if (gap_param->scan_rst.search_evt == ESP_GAP_SEARCH_INQ_RES_EVT)
            {
                const uint8_t *mfg = nullptr;
                uint8_t mfg_len = 0;

                if (wireless_extract_manufacturer_data(gap_param->scan_rst.ble_adv, gap_param->scan_rst.adv_data_len, &mfg, &mfg_len))
                {
                    wireless_handle_rx_chunk(mfg, mfg_len);
                }
                else if (gap_param->scan_rst.scan_rsp_len > 0)
                {
                    const uint8_t *scan_rsp = gap_param->scan_rst.ble_adv + gap_param->scan_rst.adv_data_len;
                    if (wireless_extract_manufacturer_data(scan_rsp, gap_param->scan_rst.scan_rsp_len, &mfg, &mfg_len))
                    {
                        wireless_handle_rx_chunk(mfg, mfg_len);
                    }
                }
            }
            break;
        default:
            break;
    }
}

void wireless_ble_init_common(const char *device_name)
{
    if (!wireless_ble_initialized)
    {
        BLEDevice::init(device_name);
        wireless_ble_initialized = true;
    }

    if (!wireless_gap_cb_registered)
    {
        esp_ble_gap_register_callback(wireless_gap_event_handler);
        wireless_gap_cb_registered = true;
    }
}

void wireless_prepare_adv_chunk(uint8_t chunk_index, uint8_t seq)
{
    uint8_t mfg_payload[2 + 7 + kWirelessChunkPayload];
    size_t total_size = sizeof(parametersType);
    size_t offset = static_cast<size_t>(chunk_index) * kWirelessChunkPayload;
    size_t data_len = (offset < total_size) ? (total_size - offset) : 0;
    if (data_len > kWirelessChunkPayload) data_len = kWirelessChunkPayload;

    mfg_payload[0] = static_cast<uint8_t>(kWirelessCompanyId & 0xFF);
    mfg_payload[1] = static_cast<uint8_t>((kWirelessCompanyId >> 8) & 0xFF);
    mfg_payload[2] = kWirelessMagic0;
    mfg_payload[3] = kWirelessMagic1;
    mfg_payload[4] = kWirelessProtoVersion;
    mfg_payload[5] = kWirelessMaxChunks;
    mfg_payload[6] = chunk_index;
    mfg_payload[7] = seq;
    mfg_payload[8] = static_cast<uint8_t>(data_len);

    if (data_len > 0)
        memcpy(&mfg_payload[9], reinterpret_cast<const uint8_t*>(&param) + offset, data_len);

    size_t mfg_len = 2 + 7 + data_len;
    uint8_t adv_raw[31];
    size_t adv_len = 0;

    adv_raw[adv_len++] = 2;
    adv_raw[adv_len++] = ESP_BLE_AD_TYPE_FLAG;
    adv_raw[adv_len++] = 0x06;

    adv_raw[adv_len++] = static_cast<uint8_t>(1 + mfg_len);
    adv_raw[adv_len++] = ESP_BLE_AD_MANUFACTURER_SPECIFIC_TYPE;
    memcpy(&adv_raw[adv_len], mfg_payload, mfg_len);
    adv_len += mfg_len;

    wireless_adv_busy = true;
    esp_ble_gap_stop_advertising();
    esp_ble_gap_config_adv_data_raw(adv_raw, adv_len);
}
}

void init_wireless_broadcaster(void)
{
    wireless_ble_init_common("ALITE2-BCAST");
    wireless_prepare_adv_chunk(0, wireless_tx_seq);
    wireless_last_tx = millis();
}

void init_wireless_audience(void)
{
    wireless_ble_init_common("ALITE2-AUD");
    wireless_scan_pending = true;
    esp_ble_gap_set_scan_params(&wireless_scan_params);
    wireless_scan_active = false;
}

void wireless_broadcaster_loop(void)
{
    if (wireless_adv_busy) return;

    uint32_t now = millis();
    if ((now - wireless_last_tx) < kWirelessBroadcastIntervalMs) return;

    wireless_last_tx = now;
    wireless_prepare_adv_chunk(wireless_tx_chunk, wireless_tx_seq);

    wireless_tx_chunk++;
    if (wireless_tx_chunk >= kWirelessMaxChunks)
    {
        wireless_tx_chunk = 0;
        wireless_tx_seq++;
    }
}

void wireless_audience_loop(void)
{
    if (!wireless_scan_active && !wireless_scan_pending)
    {
        wireless_scan_pending = true;
        esp_ble_gap_set_scan_params(&wireless_scan_params);
    }
}
