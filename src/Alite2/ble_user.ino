/*******************************************************************************
 * ble_user.ino — your own BLE packets (open)
 *
 * The official app's packets are handled inside Alite2Link and cannot be changed.
 * Every other packet written to the write characteristic arrives here:
 *
 *   packet = "<HEAD>:<payload>"     e.g. "PING:"  or  "MYCOLOR:" + 3 binary bytes
 *
 * Reply to the app with alite2_ble_notify(data, len) (notify characteristic).
 * Name, UUIDs and packet format: docs/BLE_PROTOCOL.md.
 * Pick heads that start with "U_" so they never collide with built-in packets.
 ******************************************************************************/
#include "common.h"

bool alite2_on_ble_user_packet(const char *head, const uint8_t *payload, size_t len)
{
    // "U_PING:" -> notify "U_PONG:<firmware version>"
    if (strcmp(head, "U_PING") == 0)
    {
        char reply[32];
        int n = snprintf(reply, sizeof(reply), "U_PONG:%s", FIRMWARE_VERSION);
        alite2_ble_notify((const uint8_t *)reply, n);
        return true;
    }

    // "U_STATE:" -> notify "U_STATE:" + master intensity (0-255) + boost (0/1)
    if (strcmp(head, "U_STATE") == 0)
    {
        uint8_t reply[10] = { 'U', '_', 'S', 'T', 'A', 'T', 'E', ':' };
        reply[8] = (uint8_t)(param.master_intensity * 255.0f + 0.5f);
        reply[9] = param.boost ? 1 : 0;
        alite2_ble_notify(reply, sizeof(reply));
        return true;
    }

    return false;   // unknown packet: ignored
}
