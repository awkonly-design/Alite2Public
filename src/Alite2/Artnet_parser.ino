//#include <common.h>
//#include <FastLED.h>
#include <ArtnetWiFi.h>//ver 0.8.0

ArtnetWiFiReceiver artnet;
uint32_t use_art_sync = 0;
bool art_update = false;

void artnet_set(void)
{
    artnet.unsubscribeArtDmxUniverses();
    artnet.subscribeArtDmxUniverse(param.universe, [&](const uint8_t *data, uint16_t size, const ArtDmxMetadata &metadata, const ArtNetRemoteInfo &remote) 
    {
        /*
        dbg.print("lambda : artnet data from ");
        dbg.print(remote.ip);
        dbg.print(":");
        dbg.print(remote.port);
        dbg.print(", universe = ");
        dbg.print(param.universe);
        dbg.print(", size = ");
        dbg.print(size);
        dbg.print(") :");
        for (size_t i = 0; i < size; ++i) {
            dbg.print(data[i]);
            dbg.print(",");
        }
        dbg.println();
        */

        uint8_t *start = (uint8_t *)&data[param.dmx_ch - 1];
        set_artnet_pwm_callback(start, size);
    });
}

void artnet_clear(void)
{
    artnet.unsubscribeArtDmxUniverses();
    use_art_sync = 0;
}

void init_artnet(void)
{
    char str[32];

    artnet.begin(); // send to localhost and listen to default port
    sprintf(str, "%s v%s", ALITE2_BLE_NAME, FIRMWARE_VERSION);
    artnet.setArtPollReplyConfigShortName(str);
    artnet.setArtPollReplyConfigLongName(ARTNET_LONG_NAME);

    artnet.subscribeArtSync([&](const ArtNetRemoteInfo &remote)
    {
        use_art_sync = millis();
        art_update = true;
    });
    artnet_set();
}

void check_artsync_timeout(void)
{
    if ((millis() - use_art_sync) > 3000)
    {
        use_art_sync = millis() - 3000;
        art_update = true;
    }
}

void artnet_loop(void)
{
    artnet.parse();
}

