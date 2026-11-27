#include <common.h>

uint32_t key_lastmilli = 0;
//uint32_t rotary_lastmilli = 0;

void init_buttons(void)
{
    rotaryEncoderInit();
    secondEncoderInit();

    //gpio_reset_pin(WAKEUP_GPIO);
    pinMode(KEY1_PIN, INPUT_PULLUP);
    pinMode(KEY2_PIN, INPUT_PULLUP);
    pinMode(KEY3_PIN, INPUT_PULLUP);

    key_lastmilli = millis();
}

uint8_t get_key_status(uint8_t key)
{
    switch(key)
    {
        case F1_KEY: return digitalRead(KEY1_PIN);
        case F2_KEY: return digitalRead(KEY2_PIN);
        case F3_KEY: return digitalRead(KEY3_PIN);
    }

    return 1;
}

uint8_t ikey_handle(void)
{
    static uint8_t old_key[IKEY_MAX - INT_KEY_MAX] = { 0,0,0 };
    static uint8_t count_key[IKEY_MAX - INT_KEY_MAX] = { 0,0,0 };
    uint8_t value, i;

    for(i = 0; i < (IKEY_MAX - INT_KEY_MAX); i++)
    {
    	  value = get_key_status(i + INT_KEY_MAX);

        if (value == 0)//down
        {
            if (old_key[i] != 0)//edge
                count_key[i] = 1;
            else if ((count_key[i] > 0) && (count_key[i] < LONG_IKEY_DELAY))
                count_key[i]++;
        }
        old_key[i] = value;//for finding edge

        if (value != 0)//up
        {
            if ((count_key[i] >= IKEY_DELAY) && (count_key[i] < LONG_IKEY_DELAY))
            {
                count_key[i] = 0;
                return (i + IKEY_LONG_MAX + 1);//make KEY_UP event
            }
            else
                count_key[i] = 0;
        }

        if (count_key[i] == IKEY_DELAY)
            return (i + IKEY_MAX + 1);//make KEY_DOWN event
        else if (count_key[i] > IKEY_DELAY)
        {
      			if (count_key[i] == LONG_IKEY_DELAY)//one shot
            {
                count_key[i] = LONG_IKEY_DELAY + 1;
                return (i + IKEY_DOWN_MAX + 1);//make KEY_LONG event
            }
        }
    }

    return 0;
}

uint8_t loop_buttons(void)
{
    uint8_t key = NULL_KEY;
    int8_t rotary_value;

    if ((millis() - key_lastmilli) >= 50)
    {
        key_lastmilli = millis();
        key = ikey_handle();
        //dbg.printf("%d %d %d\n", digitalRead(KEY1_PIN), digitalRead(KEY2_PIN), digitalRead(KEY3_PIN));

        if (key != NULL_KEY)
            dbg.printf("k=%d\a\n", key);
    /*
    }

    if ((millis() - rotary_lastmilli) >= 10)
    {
        rotary_lastmilli = millis();
        */
        if (key == NULL_KEY)
        {
            if (get_key_status(F1_KEY) != 0)
                rotary_value = rotaryEncoderLoop();
            else
                rotary_value = 0;

            if (rotary_value > 1) key = TURN_DOWN_FAST_KEY;
            else if (rotary_value < -1) key = TURN_UP_FAST_KEY;
            else if (rotary_value > 0) key = TURN_DOWN_KEY;
            else if (rotary_value < 0) key = TURN_UP_KEY;
            else
            {
                if (get_key_status(F2_KEY) != 0)
                    rotary_value = secondEncoderLoop();
                else 
                    rotary_value = 0;

                if (rotary_value > 1) key = SECOND_DOWN_FAST_KEY;
                else if (rotary_value < -1) key = SECOND_UP_FAST_KEY;
                else if (rotary_value > 0) key = SECOND_DOWN_KEY;
                else if (rotary_value < 0) key = SECOND_UP_KEY;
            }
        }
    }

    return key;
}