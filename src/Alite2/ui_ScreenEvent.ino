#include <common.h>
#include <lvgl.h>
#include "ui.h"


uint32_t delay_for_any = 0;

void show_message_box(const char *title, const char *message)
{
    custom_label_set_text(ui_TitleLabel, title);
    custom_label_set_text(ui_MessageLabel, message);

    if (lv_scr_act() == ui_MessageScreen) return;
    ui_screen_change(&ui_MessageScreen, LV_SCR_LOAD_ANIM_FADE_ON, 100, 0, &ui_MessageScreen_screen_init);
}

lv_timer_t *second_message_timer = NULL;
void erase_label(lv_timer_t * timer) 
{
    lv_obj_t *label = (lv_obj_t *)timer->user_data;
    custom_label_set_text(label, "");
    lv_timer_del(second_message_timer);
    second_message_timer = NULL;
}

void second_message(const char *message)
{
    if (second_message_timer != NULL)
    {
        lv_timer_del(second_message_timer);
        second_message_timer = NULL;
    }

    if (lv_scr_act() == ui_MessageScreen)
    {
        custom_label_set_text(ui_SecondLabel, message);
        second_message_timer = lv_timer_create(erase_label, 5000, ui_SecondLabel);
    }
}

void ui_screen_change(lv_obj_t **target, lv_scr_load_anim_t fademode, int32_t speed, int32_t delay, void (*init_cb)(void))
{
    //lv_anim_del_all();
    _ui_screen_change(target, fademode, speed, delay, init_cb);
    delay_for_any = millis();
}

void switchScreen(uint8_t index, lv_scr_load_anim_t amin) 
{
    wifiParam.lastPage = MENU_SCREEN;
    switch(index)
    {
        case MAIN_SCREEN://back
            ui_screen_change(&ui_MainScreen, amin, 200, 0, &ui_MainScreen_screen_init);
            wifiParam.lastPage = index;
        break;      
        case CCT_SCREEN://CCT
            custom_ui_set_slider_value(ui_CrossSlider, 0);
            ui_screen_change(&ui_ScreenDimming, amin, 200, 0, &ui_ScreenDimming_screen_init);
            wifiParam.lastPage = index;
        break;      
        case COLOR_SCREEN://Color
            custom_ui_set_slider_value(ui_CrossSlider, 100);
            set_color_type_by_tab();
            ui_screen_change(&ui_ScreenWavelength, amin, 200, 0, &ui_ScreenWavelength_screen_init);
            wifiParam.lastPage = index;
        break;      
        case EFFECT_SCREEN://Effect
            ui_screen_change(&ui_ScreenEffect, amin, 200, 0, &ui_ScreenEffect_screen_init);
            wifiParam.lastPage = index;
        break;      
        /*
        case PRESET_SCREEN://Preset
        break;      
        */
        case ARTNET_SCREEN://Artnet
            ui_screen_change(&ui_ArtnetScreen, amin, 100, 0, &ui_ArtnetScreen_screen_init);
            wifiParam.lastPage = index;
        break;      
        case SETUP_SCREEN:
            ui_screen_change(&ui_SetupScreen, amin, 100, 0, &ui_SetupScreen_screen_init);
            wifiParam.lastPage = index;
        break;
        case QR_SCREEN:
            ui_screen_change(&ui_QrScreen, amin, 100, 0, &ui_QrScreen_screen_init);
        break;
        case MENU_SCREEN:
            ui_screen_change(&ui_MenuScreen, amin, 100, 0, &ui_MenuScreen_screen_init);
        break;
    }

    wififs.putUChar("lastPage", wifiParam.lastPage);
}

void turnOnScreenOnce(lv_scr_load_anim_t amin) 
{
    //ui_screen_change(&ui_MenuScreen, amin, 200, 0, &ui_MenuScreen_screen_init);
    switchScreen(wifiParam.lastPage, amin);
}


void setScreenWithIndex(uint8_t index, lv_scr_load_anim_t amin) 
{
    if (ui_is_updating) return; // prevent re-entry
    if ((millis() - delay_for_any) < 300) return;

    if (lv_scr_act() == ui_MessageScreen) return; //Do not change when it's in message screen

    switchScreen(index, amin);
}

void ArcValueChanged(lv_event_t *e)
{
    lv_obj_t *obj = lv_event_get_target(e);
    if (obj == NULL || !lv_obj_is_valid(obj)) return;//20250621 found the reason to reset
    //Serial.printf("%x %x\n", obj, ui_MasterArc);

    if (ui_MasterArc == obj)
    {
        param.master_intensity = 0.01 * lv_arc_get_value(obj);
        prefs.putFloat(MASTER_INTENSITY_KEY, param.master_intensity);
    }
    else if (ui_DimmingArc == obj)
    {
        param.cct_intensity = 0.01 * lv_arc_get_value(obj);
        prefs.putFloat(CCT_INTENSITY_KEY, param.cct_intensity);
    }
    else if (ui_WaveDimArc == obj)
    {
        param.color.dimming = 0.01 * lv_arc_get_value(obj);
        prefs.putFloat(WAVEDIMM_KEY, param.color.dimming);        
    }

    need_to_calc = true;
}

void SliderValueChanged(lv_event_t *e)
{
    lv_obj_t *obj = lv_event_get_target(e);
    
    if (ui_CctSlider == obj)
    {
        param.cct_pos = ((float)lv_slider_get_value(obj) - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN);
        prefs.putFloat(CCT_POS_KEY, param.cct_pos);
    }
    else if (ui_GmSlider == obj)
    {
        param.green_magenta = 0.01 * lv_slider_get_value(obj);
        prefs.putFloat(GREEN_MAGENTA_KEY, param.green_magenta);
    }
    else if (ui_EffectDimSlider == obj)
    {
        param.effect.dimming = 0.01 * lv_slider_get_value(obj);
        prefs.putFloat(EFFECT_DIM_KEY, param.effect.dimming);        
    }
    else if (ui_EffectSpeedSlider == obj)
    {
        param.effect.speed = 0.01 * lv_slider_get_value(obj);
        prefs.putFloat(EFFECT_SPEED_KEY, param.effect.speed);        
    }
    else if (ui_CrossSlider == obj)
    {
        param.cross_fade = 0.01 * lv_slider_get_value(obj);
        prefs.putFloat(CROSS_FADE_KEY, param.cross_fade);
    }
    else if (ui_HueSlider == obj)
    {
        param.color.hs.hue = (float)lv_slider_get_value(obj);
        prefs.putFloat(HUE_KEY, param.color.hs.hue);
    }
    else if (ui_SatSlider == obj)
    {
        param.color.hs.sat = 0.01 * lv_slider_get_value(obj);
        prefs.putFloat(SAT_KEY, param.color.hs.sat);
    }
    else if (ui_WaveColorSlider == obj)
    {
        uint32_t w = lv_slider_get_value(obj);

        param.color.length = ((float)w - MIN_WAVELENGTH) / (MAX_WAVELENGTH - MIN_WAVELENGTH);
        prefs.putFloat(WAVELENGTH_KEY, param.color.length);

        if (w < 445)
            custom_label_set_text(ui_ColorNameLabel, "Deep Blue");
        else if (w < 455)
            custom_label_set_text(ui_ColorNameLabel, "Blue");
        else if (w < 465)
            custom_label_set_text(ui_ColorNameLabel, "Vivid Blue");
        else if (w < 475)
            custom_label_set_text(ui_ColorNameLabel, "Blue-Cyan");
        else if (w < 485)
            custom_label_set_text(ui_ColorNameLabel, "Cyan");
        else if (w < 495)
            custom_label_set_text(ui_ColorNameLabel, "Light Cyan");
        else if (w < 505)
            custom_label_set_text(ui_ColorNameLabel, "Cyan-Green");
        else if (w < 515)
            custom_label_set_text(ui_ColorNameLabel, "Aqua");
        else if (w < 525)
            custom_label_set_text(ui_ColorNameLabel, "Green");
        else if (w < 535)
            custom_label_set_text(ui_ColorNameLabel, "Vivid Green");
        else if (w < 545)
            custom_label_set_text(ui_ColorNameLabel, "Yellow-Green");
        else if (w < 555)
            custom_label_set_text(ui_ColorNameLabel, "Lime Green");
        else if (w < 565)
            custom_label_set_text(ui_ColorNameLabel, "Yellowish Green");
        else if (w < 575)
            custom_label_set_text(ui_ColorNameLabel, "Chartreuse");
        else if (w < 585)
            custom_label_set_text(ui_ColorNameLabel, "Yellow");
        else if (w < 595)
            custom_label_set_text(ui_ColorNameLabel, "Golden Yellow");
        else if (w < 605)
            custom_label_set_text(ui_ColorNameLabel, "Amber");
        else if (w < 615)
            custom_label_set_text(ui_ColorNameLabel, "Orange");
        else if (w < 625)
            custom_label_set_text(ui_ColorNameLabel, "Red-Orange");
        else if (w < 635)
            custom_label_set_text(ui_ColorNameLabel, "Vermilion");
        else if (w < 645)
            custom_label_set_text(ui_ColorNameLabel, "Red");
        else if (w < 655)
            custom_label_set_text(ui_ColorNameLabel, "Deep Red");
        else
            custom_label_set_text(ui_ColorNameLabel, "Magenta");
    }
}

void RollerValueChanged(lv_event_t *e)
{
    lv_obj_t *obj = lv_event_get_target(e);

    if (obj == ui_EffectRoller)
    {
        /*
        //uint16_t selected = lv_roller_get_selected(ui_EffectRoller);
        memset(param.effect.name, 0x00, EFFECT_NAME_LEN);
        lv_roller_get_selected_str(ui_EffectRoller, param.effect.name, EFFECT_NAME_LEN);
        size_t saved = prefs.putBytes(EFFECT_NAME_KEY, param.effect.name, EFFECT_NAME_LEN);
        dbg.printf("%s %d\n", param.effect.name, saved);
        */
        param.effect.no = lv_roller_get_selected(ui_EffectRoller);
        prefs.putUChar(EFFECT_NO_KEY, param.effect.no);
    }
    else if (obj == ui_SlotRoller)
    {
        uint32_t i = lv_roller_get_selected(ui_SlotRoller);
        put_slot_name(i);
        reload_slot_parameters();
        ui_initScreen();
        //esp_restart();//here need to make a pop-up box
    }
    else if (obj == ui_MenuRoller)
    {
    }
}

void ArtnetArcValueChanged(lv_event_t *e)
{
    lv_obj_t *obj = lv_event_get_target(e);
    char str[128];
    
    if (obj == ui_DmxChArc)
    {
        param.dmx_ch = lv_arc_get_value(obj);
        update_artnet_message_string(str, sizeof(str));
        custom_label_set_text(ui_MessageLabel, str);
        prefs.putUShort(DMX_CH_KEY, param.dmx_ch);
    }
    else if (obj == ui_UniverseSlider)
    {
        param.universe = lv_slider_get_value(obj);
        update_artnet_message_string(str, sizeof(str));
        custom_label_set_text(ui_MessageLabel, str);
        prefs.putUShort(UNIVERSE_KEY, param.universe);
        artnet_set();
    }
}

void DropdownValueChanged(lv_event_t *e)
{
    lv_obj_t *obj = lv_event_get_target(e);

    if (obj == ui_DmxModeDropdown)
    {
        param.dmx_mode = dmx_mode_from_menu(lv_dropdown_get_selected(obj));
        prefs.putUChar(DMX_MODE_KEY, param.dmx_mode);
    }
    else if (obj == ui_DmxBitsDropdown)
    {
        param.dmx_bits = lv_dropdown_get_selected(obj);
        prefs.putUChar(DMX_BITS_KEY, param.dmx_bits);
    }
    else if (obj == ui_TrigDropdown)
    {
        param.effect.trig = lv_dropdown_get_selected(obj);
        if (param.effect.trig == TRIG_BLACKOUT)
        {
            prefs.putUChar(EFFECT_TRIG_KEY, TRIG_OFF);
            set_blackout(true);
        }
        else
        {
            prefs.putUChar(EFFECT_TRIG_KEY, param.effect.trig);
            set_blackout(false);
        }
    }
}

void BoostCheckboxChanged(lv_event_t *e)
{
    lv_obj_t *obj = lv_event_get_target(e);

    if (lv_obj_has_state(obj, LV_STATE_CHECKED))
        set_led_boost(true);
    else
        set_led_boost(false);
}
