#include <common.h>
#include <lvgl.h>
#include "ui.h"

extern "C" {
    #include "multi_language.h"
}

bool ui_is_updating = false;

bool check_ui_valid(lv_obj_t *obj)
{
    if (obj != NULL && lv_obj_is_valid(obj))
        return true;
    
    return false;
}

void custom_ui_set_arc_value(lv_obj_t * target, int val)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    ui_is_updating = true;

    lv_arc_set_value(target, val);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, 0);

    ui_is_updating = false;
}

void custom_ui_set_slider_value(lv_obj_t * target, int val)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    ui_is_updating = true;

    lv_slider_set_value(target, val, LV_ANIM_OFF);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, 0);

    ui_is_updating = false;
}

void custom_ui_arc_increment(lv_obj_t *target, int32_t val)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    if (target == NULL || !lv_obj_is_valid(target)) return;

    ui_is_updating = true;

    int old = lv_arc_get_value(target);
    int new_val = old + val;

    int min = lv_arc_get_min_value(target);
    int max = lv_arc_get_max_value(target);

    if (new_val < min) new_val = min;
    if (new_val > max) new_val = max;

    lv_arc_set_value(target, new_val);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, NULL);

    ui_is_updating = false;
}

void custom_ui_slider_increment(lv_obj_t *target, int32_t val)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    if (target == NULL || !lv_obj_is_valid(target)) return;

    ui_is_updating = true;

    int old = lv_slider_get_value(target);
    int new_val = old + val;

    int min = lv_slider_get_min_value(target);
    int max = lv_slider_get_max_value(target);

    if (new_val < min) new_val = min;
    if (new_val > max) new_val = max;

    lv_slider_set_value(target, new_val, LV_ANIM_ON);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, NULL);

    ui_is_updating = false;
}

void custom_ui_slider_increment_wrap(lv_obj_t *target, int32_t val)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    if (target == NULL || !lv_obj_is_valid(target)) return;

    ui_is_updating = true;

    int old = lv_slider_get_value(target);
    int new_val = old + val;

    int min = lv_slider_get_min_value(target);
    int max = lv_slider_get_max_value(target);
    int range = max - min + 1;

    if (new_val < min) {
        while (new_val < min) new_val += range;
    }
    if (new_val > max) {
        while (new_val > max) new_val -= range;
    }

    lv_slider_set_value(target, new_val, LV_ANIM_ON);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, NULL);

    ui_is_updating = false;
}

void custom_ui_set_colorwheel_rgb(lv_obj_t * target, lv_color_t color)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    ui_is_updating = true;

    lv_colorwheel_set_rgb(target, color);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, 0);

    ui_is_updating = false;
}

void custom_ui_set_dropdown_selected(lv_obj_t * target, int val, uint16_t delay)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    if ((millis() - delay_for_any) < delay) return;//reduce key jitter
    ui_is_updating = true;

    lv_dropdown_set_selected(target, val);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, 0);

    ui_is_updating = false;
    delay_for_any = millis();
}

void custom_lv_tabview_set_act(lv_obj_t * tabview, uint32_t id, lv_anim_enable_t anim)
{
    if (check_ui_valid(tabview) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    if ((millis() - delay_for_any) < 200) return;//reduce key jitter

    //lv_anim_del_all();
    lv_tabview_set_act(tabview, id, anim);

    delay_for_any = millis();
}

void custom_ui_set_roller_selected(lv_obj_t * target, int val, lv_anim_enable_t anim)
{
    if (check_ui_valid(target) == false) return;

    if (ui_is_updating) return; // prevent re-entry
    ui_is_updating = true;

    lv_roller_set_selected(target, val, anim);
    lv_event_send(target, LV_EVENT_VALUE_CHANGED, 0);

    ui_is_updating = false;
}

void custom_roller_set_selected_str(lv_obj_t *roller, const char *target, lv_anim_enable_t anim)
{
    if (check_ui_valid(roller) == false) return;

    const char *options = lv_roller_get_options(roller);
    uint16_t index = 0;
    const char *p = options;

    while (*p) 
    {
        const char *line_start = p;
        while (*p && *p != '\n') p++;
        size_t len = p - line_start;

        if (strncmp(line_start, target, len) == 0 && strlen(target) == len) 
        {
            lv_roller_set_selected(roller, index, anim);
            //Do not call LV_EVENT_VALUE_CHANGED in here
            //Only use this function in initial for effect
            return;
        }

        if (*p == '\n') p++;
        index++;
    }
}

void custom_checkbox(lv_obj_t *obj, bool flag)
{
    if (check_ui_valid(obj) == false) return;
    if (lv_obj_has_state(obj, LV_STATE_CHECKED) == flag) return;

    if (flag)
        lv_obj_add_state(obj, LV_STATE_CHECKED);
    else
        lv_obj_clear_state(obj, LV_STATE_CHECKED);
    lv_event_send(obj, LV_EVENT_VALUE_CHANGED, NULL);
}

void custom_label_set_text(lv_obj_t *obj, const char *text)
{
    if (check_ui_valid(obj) == false) return;
    const char *resolved = text;
    const char *localized = NULL;
    uint8_t lang = wifiParam.lang;

    if (text && multi_language_find_active_text(obj, text, lang, &localized))
        resolved = localized;

    const lv_font_t *font = multi_language_get_font(lang);
    if (font)
        lv_obj_set_style_text_font(obj, font, LV_PART_MAIN | LV_STATE_DEFAULT);

    lv_label_set_text(obj, resolved ? resolved : "");
}

/*
void custom_label_set_text(lv_obj_t *obj, const char *text)
{
    if (check_ui_valid(obj) == false) return;
    lv_label_set_text(obj, text);
}

void getRollerOptionAtIndex(lv_obj_t* roller, int index, char* buffer, size_t bufferSize) 
{
  const char* options = lv_roller_get_options(roller);
  int current = 0;
  const char* start = options;
  const char* ptr = options;

  while (*ptr) {
    if (*ptr == '\n' || *(ptr + 1) == '\0') {
      if (current == index) {
        size_t len = ptr - start;
        if (*(ptr + 1) == '\0') len++; // include the last item
        if (len >= bufferSize) len = bufferSize - 1;
        strncpy(buffer, start, len);
        buffer[len] = '\0';
        return;
      }
      current++;
      start = ptr + 1;
    }
    ptr++;
  }

  // return an empty string when the index is out of range
  if (bufferSize > 0) buffer[0] = '\0';
}
*/

void ui_initSlot(void)
{
    custom_ui_set_roller_selected(ui_SlotRoller, slotName[0] - 'A', LV_ANIM_OFF);
}

void ui_initScreen(void)
{
    ui_is_updating = false;

    custom_ui_set_arc_value(ui_MasterArc, param.master_intensity * 100);
    custom_ui_set_slider_value(ui_CrossSlider, param.cross_fade * 100);
    custom_ui_set_arc_value(ui_DimmingArc, param.cct_intensity * 100);
    lv_slider_set_range(ui_CctSlider, MIN_KELVIN, MAX_KELVIN);
    custom_ui_set_slider_value(ui_CctSlider, param.cct_pos * (MAX_KELVIN - MIN_KELVIN) + MIN_KELVIN);
    custom_ui_set_slider_value(ui_GmSlider, param.green_magenta * 100);
    custom_ui_set_arc_value(ui_WaveDimArc, param.color.dimming * 100);
    custom_ui_set_slider_value(ui_HueSlider, param.color.hs.hue);
    custom_ui_set_slider_value(ui_SatSlider, param.color.hs.sat * 100);
    lv_slider_set_range(ui_WaveColorSlider, MIN_WAVELENGTH, MAX_WAVELENGTH);
    custom_ui_set_slider_value(ui_WaveColorSlider, param.color.length * (MAX_WAVELENGTH - MIN_WAVELENGTH) + MIN_WAVELENGTH);

    //dbg.printf("Effect: %s\n", param.effect.name);
    custom_ui_set_slider_value(ui_EffectDimSlider, param.effect.dimming * 100);
    custom_ui_set_slider_value(ui_EffectSpeedSlider, param.effect.speed * 100);
    custom_ui_set_roller_selected(ui_EffectRoller, param.effect.no, LV_ANIM_OFF);
    custom_ui_set_dropdown_selected(ui_TrigDropdown, param.effect.trig, 0);

    custom_ui_set_arc_value(ui_DmxChArc, param.dmx_ch);
    custom_ui_set_slider_value(ui_UniverseSlider, param.universe);
    custom_ui_set_dropdown_selected(ui_DmxModeDropdown, menu_from_dmx_mode(param.dmx_mode), 0);
    custom_ui_set_dropdown_selected(ui_DmxBitsDropdown, param.dmx_bits, 0);
    custom_checkbox(ui_BoostCheckbox, param.boost);
}

void ui_initGlobalScreen(void)
{
    ui_is_updating = false;

    custom_ui_set_dropdown_selected(ui_ArtnetDropdown, wifiParam.wireless, 0);//it has to be global because system have to be reset when it changed 
    char ver[32];
    snprintf(ver, sizeof(ver), "%s (%lu)", FIRMWARE_VERSION, (unsigned long)firmware_build_number());
    custom_label_set_text(ui_VersionLabel, ver);
}

void auto_switch_dimming_arc(lv_obj_t *obj)
{
    int32_t arc_v = lv_arc_get_value(obj);

    if (arc_v == 0)
        custom_ui_set_arc_value(obj, 100);
    else
        custom_ui_set_arc_value(obj, 0);
}

void switch_boost(void)
{
    if (lv_obj_has_state(ui_BoostCheckbox, LV_STATE_CHECKED))
        custom_checkbox(ui_BoostCheckbox, false);
    else
    {
        if (get_battery_danger() == NORMAL_BATTERY)
            custom_checkbox(ui_BoostCheckbox, true);
    }
}

void ui_MenuScreenState(lv_obj_t *self, uint8_t *key)
{
    uint16_t selected = lv_roller_get_selected(ui_MenuRoller);

    switch(*key)
    {
        case SECOND_DOWN_KEY:
        case SECOND_DOWN_FAST_KEY:
        case TURN_DOWN_KEY:
        case TURN_DOWN_FAST_KEY:
            if ((millis() - delay_for_any) < 200) return;//reduce key jitter
            if (selected > 0)
                custom_ui_set_roller_selected(ui_MenuRoller, selected - 1, LV_ANIM_ON);
            delay_for_any = millis();
        break;
        case SECOND_UP_KEY:
        case SECOND_UP_FAST_KEY:
        case TURN_UP_KEY:
        case TURN_UP_FAST_KEY:
            if ((millis() - delay_for_any) < 200) return;//reduce key jitter
            if (selected < (lv_roller_get_option_cnt(ui_MenuRoller) - 1))
                custom_ui_set_roller_selected(ui_MenuRoller, selected + 1, LV_ANIM_ON);
            delay_for_any = millis();
        break;

        //case F1_KEY_UP:
            //lv_event_send(ui_MainMenuLabel, LV_EVENT_CLICKED, NULL);
        //break;
        case F2_KEY_UP:
        case F1_KEY_UP:
            if (selected == FLIP_SCREEN)
                flip_rotate();
            else
                setScreenWithIndex(selected, LV_SCR_LOAD_ANIM_MOVE_LEFT);
        break;

        case F2_KEY_LONG:
            //Boost mode
            switch_boost();
        break;
    }
}

void ui_MainScreenState(lv_obj_t *self, uint8_t *key)
{
    //if (ui_MainScreen != self) return;
    uint32_t lv_key;

    switch(*key)
    {
        case SECOND_DOWN_KEY:
            custom_ui_arc_increment(ui_MasterArc, -1);
        break;
        case SECOND_DOWN_FAST_KEY:
            custom_ui_arc_increment(ui_MasterArc, -10);
        break;
        case SECOND_UP_KEY:
            custom_ui_arc_increment(ui_MasterArc, 1);
        break;
        case SECOND_UP_FAST_KEY:
            custom_ui_arc_increment(ui_MasterArc, 10);
        break;
        case TURN_DOWN_KEY:
            custom_ui_slider_increment(ui_CrossSlider, -1);
        break;
        case TURN_DOWN_FAST_KEY:
            custom_ui_slider_increment(ui_CrossSlider, -10);
        break;
        case TURN_UP_KEY:
            custom_ui_slider_increment(ui_CrossSlider, 1);
        break;
        case TURN_UP_FAST_KEY:
            custom_ui_slider_increment(ui_CrossSlider, 10);
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;

        case F1_KEY_UP:
        break;

        case F2_KEY_LONG:
            //Boost mode
            switch_boost();
        break;
    }
}

void ui_ScreenDimmingState(lv_obj_t *self, uint8_t *key)
{
    //if (ui_ScreenDimming != self) return;
    uint32_t lv_key;
    uint16_t tab = lv_tabview_get_tab_act(ui_CCTTabView);

    switch(*key)
    {
        case SECOND_DOWN_KEY:
            custom_ui_arc_increment(ui_DimmingArc, -1);
        break;
        case SECOND_DOWN_FAST_KEY:
            custom_ui_arc_increment(ui_DimmingArc, -10);
        break;
        case SECOND_UP_KEY:
            custom_ui_arc_increment(ui_DimmingArc, 1);
        break;
        case SECOND_UP_FAST_KEY:
            custom_ui_arc_increment(ui_DimmingArc, 10);
        break;
        case TURN_DOWN_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment(ui_CctSlider, -100); break;
                case 1: custom_ui_slider_increment(ui_GmSlider, -1); break;
            }
        break;
        case TURN_DOWN_FAST_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment(ui_CctSlider, -1000); break;
                case 1: custom_ui_slider_increment(ui_GmSlider, -10); break;
            }
        break;
        case TURN_UP_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment(ui_CctSlider, 100); break;
                case 1: custom_ui_slider_increment(ui_GmSlider, 1); break;
            }
        break;
        case TURN_UP_FAST_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment(ui_CctSlider, 1000); break;
                case 1: custom_ui_slider_increment(ui_GmSlider, 10); break;
            }
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;

        case F1_KEY_UP:
            custom_lv_tabview_set_act(ui_CCTTabView, (tab + 1) % ((lv_tabview_t *)ui_CCTTabView)->tab_cnt, LV_ANIM_ON);
        break;
        case F2_KEY_LONG:
            //Boost mode
            switch_boost();
        break;
    }
}

void ui_ArtnetScreenState(lv_obj_t *self, uint8_t *key)
{
    //if (ui_ArtnetScreen != self) return;
    uint32_t lv_key;
    uint16_t tab = lv_tabview_get_tab_act(ui_ArtnetTabView);

    switch(*key)
    {
        case SECOND_DOWN_KEY:
            custom_ui_arc_increment(ui_DmxChArc, -1);
        break;
        case SECOND_DOWN_FAST_KEY:
            custom_ui_arc_increment(ui_DmxChArc, -50);
        break;
        case SECOND_UP_KEY:
            custom_ui_arc_increment(ui_DmxChArc, 1);
        break;
        case SECOND_UP_FAST_KEY:
            custom_ui_arc_increment(ui_DmxChArc, 50);
        break;
        case TURN_DOWN_KEY:
        case TURN_DOWN_FAST_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment(ui_UniverseSlider, -1); break;
                case 1:
                {
                    uint32_t v = lv_dropdown_get_selected(ui_DmxModeDropdown);
                    if (v > 0)
                        custom_ui_set_dropdown_selected(ui_DmxModeDropdown, v - 1, 500);
                }
                break;
                case 2:
                {
                    uint32_t v = lv_dropdown_get_selected(ui_DmxBitsDropdown);
                    if (v > 0)
                        custom_ui_set_dropdown_selected(ui_DmxBitsDropdown, v - 1, 500);
                }
                break;
            }
        break;
        case TURN_UP_KEY:
        case TURN_UP_FAST_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment(ui_UniverseSlider, 1); break;
                case 1:
                {
                    uint32_t v = lv_dropdown_get_selected(ui_DmxModeDropdown);

                    if (v < (((lv_dropdown_t *)ui_DmxModeDropdown)->option_cnt - 1))
                        custom_ui_set_dropdown_selected(ui_DmxModeDropdown, v + 1, 500);
                }
                break;
                case 2:
                {
                    uint32_t v = lv_dropdown_get_selected(ui_DmxBitsDropdown);

                    if (v < (((lv_dropdown_t *)ui_DmxBitsDropdown)->option_cnt - 1))
                        custom_ui_set_dropdown_selected(ui_DmxBitsDropdown, v + 1, 500);
                }
                break;
            }
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;
        case F1_KEY_UP:
            custom_lv_tabview_set_act(ui_ArtnetTabView, (tab + 1) % ((lv_tabview_t *)ui_ArtnetTabView)->tab_cnt, LV_ANIM_ON);
        break;
    }
}

void set_color_type_by_tab(void)
{
    if (check_ui_valid(ui_ColorTabView) == false) return;

    uint16_t tab = lv_tabview_get_tab_act(ui_ColorTabView);
    if (tab == 2) 
    {
        lv_obj_add_flag(ui_HueLabel, LV_OBJ_FLAG_HIDDEN);
        lv_obj_add_flag(ui_SatLabel, LV_OBJ_FLAG_HIDDEN);
        lv_obj_clear_flag(ui_WaveColorLabel, LV_OBJ_FLAG_HIDDEN);
        param.color.type = COLOR_WAVE;
    }
    else 
    {
        lv_obj_clear_flag(ui_HueLabel, LV_OBJ_FLAG_HIDDEN);
        lv_obj_clear_flag(ui_SatLabel, LV_OBJ_FLAG_HIDDEN);
        lv_obj_add_flag(ui_WaveColorLabel, LV_OBJ_FLAG_HIDDEN);
        param.color.type = COLOR_HSI;
    }

    prefs.putUChar(COLOR_TYPE_KEY, param.color.type);
}

void ui_ScreenWavelengthState(lv_obj_t *self, uint8_t *key)
{
    //if (ui_MainScreen != self) return;
    uint32_t lv_key;
    uint16_t tab = lv_tabview_get_tab_act(ui_ColorTabView);

    switch(*key)
    {
        case SECOND_DOWN_KEY:
            custom_ui_arc_increment(ui_WaveDimArc, -1);
        break;
        case SECOND_DOWN_FAST_KEY:
            custom_ui_arc_increment(ui_WaveDimArc, -10);
        break;
        case SECOND_UP_KEY:
            custom_ui_arc_increment(ui_WaveDimArc, 1);
        break;
        case SECOND_UP_FAST_KEY:
            custom_ui_arc_increment(ui_WaveDimArc, 10);
        break;
        case TURN_DOWN_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment_wrap(ui_HueSlider, -1); break;
                case 1: custom_ui_slider_increment(ui_SatSlider, -1); break;
                case 2: custom_ui_slider_increment_wrap(ui_WaveColorSlider, -5); break;
            }
        break;
        case TURN_DOWN_FAST_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment_wrap(ui_HueSlider, -30); break;
                case 1: custom_ui_slider_increment(ui_SatSlider, -10); break;
                case 2: custom_ui_slider_increment_wrap(ui_WaveColorSlider, -50); break;
            }
        break;
        case TURN_UP_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment_wrap(ui_HueSlider, 1); break;
                case 1: custom_ui_slider_increment(ui_SatSlider, 1); break;
                case 2: custom_ui_slider_increment_wrap(ui_WaveColorSlider, 5); break;
            }
        break;
        case TURN_UP_FAST_KEY:
            switch(tab)
            {
                case 0: custom_ui_slider_increment_wrap(ui_HueSlider, 30); break;
                case 1: custom_ui_slider_increment(ui_SatSlider, 10); break;
                case 2: custom_ui_slider_increment_wrap(ui_WaveColorSlider, 50); break;
            }
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;

        case F1_KEY_UP:
            custom_lv_tabview_set_act(ui_ColorTabView, (tab + 1) % ((lv_tabview_t *)ui_ColorTabView)->tab_cnt, LV_ANIM_ON);
            set_color_type_by_tab();
        break;

        case F2_KEY_LONG:
            //Boost mode
            switch_boost();
        break;
    }
}

void ui_ScreenEffectState(lv_obj_t *self, uint8_t *key)
{
    //if (ui_MainScreen != self) return;
    uint32_t lv_key;
    uint16_t tab = lv_tabview_get_tab_act(ui_EffectTabView);
    uint16_t selected = lv_roller_get_selected(ui_EffectRoller);

    switch(*key)
    {
        case SECOND_DOWN_KEY:
        case SECOND_DOWN_FAST_KEY:
            if ((millis() - delay_for_any) < 200) return;//reduce key jitter
            if (selected > 0)
                custom_ui_set_roller_selected(ui_EffectRoller, selected - 1, LV_ANIM_ON);
            delay_for_any = millis();
        break;
        case SECOND_UP_KEY:
        case SECOND_UP_FAST_KEY:
            if ((millis() - delay_for_any) < 200) return;//reduce key jitter
            if (selected < (lv_roller_get_option_cnt(ui_EffectRoller) - 1))
                custom_ui_set_roller_selected(ui_EffectRoller, selected + 1, LV_ANIM_ON); 
            delay_for_any = millis();
        break;
        case TURN_DOWN_KEY:
            switch(tab)
            {
                case 0: 
                {
                    uint32_t v = lv_dropdown_get_selected(ui_TrigDropdown);
                    if (v > 0)
                        custom_ui_set_dropdown_selected(ui_TrigDropdown, v - 1, 500);
                }
                break;
                case 1: custom_ui_slider_increment(ui_EffectDimSlider, -1); break;
                case 2: custom_ui_slider_increment(ui_EffectSpeedSlider, -1); break;
            }
        break;
        case TURN_DOWN_FAST_KEY:
            switch(tab)
            {
                case 0: 
                {
                    uint32_t v = lv_dropdown_get_selected(ui_TrigDropdown);
                    if (v > 0)
                        custom_ui_set_dropdown_selected(ui_TrigDropdown, v - 1, 500);
                }
                break;
                case 1: custom_ui_slider_increment(ui_EffectDimSlider, -10); break;
                case 2: custom_ui_slider_increment(ui_EffectSpeedSlider, -10); break;
            }
        break;
        case TURN_UP_KEY:
            switch(tab)
            {
                case 0:
                {
                    uint32_t v = lv_dropdown_get_selected(ui_TrigDropdown);

                    if (v < (((lv_dropdown_t *)ui_TrigDropdown)->option_cnt - 1))
                        custom_ui_set_dropdown_selected(ui_TrigDropdown, v + 1, 500);
                }
                break;
                case 1: custom_ui_slider_increment(ui_EffectDimSlider, 1); break;
                case 2: custom_ui_slider_increment(ui_EffectSpeedSlider, 1); break;
            }
        break;
        case TURN_UP_FAST_KEY:
            switch(tab)
            {
                case 0:
                {
                    uint32_t v = lv_dropdown_get_selected(ui_TrigDropdown);

                    if (v < (((lv_dropdown_t *)ui_TrigDropdown)->option_cnt - 1))
                        custom_ui_set_dropdown_selected(ui_TrigDropdown, v + 1, 500);
                }
                break;
                case 1: custom_ui_slider_increment(ui_EffectDimSlider, 10); break;
                case 2: custom_ui_slider_increment(ui_EffectSpeedSlider, 10); break;
            }
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;

        case F1_KEY_UP:
            custom_lv_tabview_set_act(ui_EffectTabView, (tab + 1) % ((lv_tabview_t *)ui_EffectTabView)->tab_cnt, LV_ANIM_ON);
        break;

    }
}
void ui_SetupScreenState(lv_obj_t *self, uint8_t *key)
{
    uint32_t lv_key;
    uint16_t tab = lv_tabview_get_tab_act(ui_SetupTabView);
    uint16_t selected = lv_roller_get_selected(ui_SlotRoller);

    switch(*key)
    {
        case TURN_DOWN_KEY:
        case TURN_DOWN_FAST_KEY:
            switch(tab)
            {
                case 0: 
                    if ((millis() - delay_for_any) < 200) return;//reduce key jitter
                    if (selected > 0)
                        custom_ui_set_roller_selected(ui_SlotRoller, selected - 1, LV_ANIM_ON); 
                    delay_for_any = millis();
                break;
                case 1: 
                {
                    uint8_t s = lv_dropdown_get_selected(ui_ArtnetDropdown);
                    if (s > 0)
                        custom_ui_set_dropdown_selected(ui_ArtnetDropdown, s - 1, 500);
                }
                break;
                case 2: 
                {
                    uint8_t s = lv_dropdown_get_selected(ui_UpdateDropdown);
                    if (s > 0)
                        custom_ui_set_dropdown_selected(ui_UpdateDropdown, s - 1, 500);
                }
                break;
            }
        break;
        case TURN_UP_KEY:
        case TURN_UP_FAST_KEY:
            switch(tab)
            {
                case 0: 
                    if ((millis() - delay_for_any) < 200) return;//reduce key jitter
                    if (selected < (lv_roller_get_option_cnt(ui_SlotRoller) - 1))
                        custom_ui_set_roller_selected(ui_SlotRoller, selected + 1, LV_ANIM_ON); 
                    delay_for_any = millis();
                break;
                case 1: 
                {
                    uint8_t s = lv_dropdown_get_selected(ui_ArtnetDropdown);
                    if (s < (lv_dropdown_get_option_cnt(ui_ArtnetDropdown) - 1))
                        custom_ui_set_dropdown_selected(ui_ArtnetDropdown, s + 1, 500);
                }
                break;
                case 2: 
                {
                    uint8_t s = lv_dropdown_get_selected(ui_UpdateDropdown);
                    if (s < (lv_dropdown_get_option_cnt(ui_UpdateDropdown) - 1))
                        custom_ui_set_dropdown_selected(ui_UpdateDropdown, s + 1, 500);
                }
                break;
            }
        break;

        case F1_KEY_UP:
            custom_lv_tabview_set_act(ui_SetupTabView, (tab + 1) % ((lv_tabview_t *)ui_SetupTabView)->tab_cnt, LV_ANIM_ON);
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;
        case F2_KEY_LONG:
            switch(tab)
            {
                case 0: 
                break;
                case 1: //Bluetooth or Artnet
                    if (lv_dropdown_get_selected(ui_ArtnetDropdown) == WIRELESS_LUMEN)
                    {
                        if (detect_lumen_module() == false)
                        {
                            custom_label_set_text(ui_IpLabel, "No Lumen Device\nis detected");
                            lv_timer_handler();//update screen
                            return;
                        }
                    }

                    wifiParam.wireless = lv_dropdown_get_selected(ui_ArtnetDropdown);
                    wififs.putUChar(WIRELESS_KEY, wifiParam.wireless);
                    esp_restart();
                break;
                case 2: //Firmware upgrade / revert / reset / language
                    if (UPGRADE_FIRMWARE == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {
                        official_update();   // restarts after a successful update, otherwise shows why not
                    }
                    else if (UNDO_FIRMWARE == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {
                        // boots the other OTA slot if it holds a valid app (restarts), otherwise returns
                        alite2_ota_revert();
                        custom_label_set_text(ui_FirmwareLabel, "No previous\nfirmware found");
                    }
                    else if (FACTORY_RESET == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {
                        factory_reset_wifi_parameters();
                        delay(1000);
                        esp_restart();
                    }
                    else if (LUMEN_RESET == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {       
                        if (detect_lumen_module() == false)
                            return;

                        reset_lumen_link();
                        delay(3000);
                        esp_restart();
                    }
                    else if (ENGLISH_MODE == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {
                        wifiParam.lang = LANG_ENG;
                        wififs.putUChar(LANG_KEY, wifiParam.lang);
                        delay(100);
                        esp_restart();
                    }
                    else if (KOREAN_MODE == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {
                        wifiParam.lang = LANG_KOR;
                        wififs.putUChar(LANG_KEY, wifiParam.lang);
                        delay(100);
                        esp_restart();
                    }
                    else if (JAPANESE_MODE == lv_dropdown_get_selected(ui_UpdateDropdown))
                    {
                        wifiParam.lang = LANG_JPN;
                        wififs.putUChar(LANG_KEY, wifiParam.lang);
                        delay(100);
                        esp_restart();
                    }
                break;
            }
        break;
    }
}

void ui_QrScreenState(lv_obj_t *self, uint8_t *key)
{
    uint16_t tab = lv_tabview_get_tab_act(ui_QrTabView);

    switch(*key)
    {
        case TURN_DOWN_KEY:
        case TURN_DOWN_FAST_KEY:
        case TURN_UP_KEY:
        case TURN_UP_FAST_KEY:
        break;

        case F1_KEY_UP:
            custom_lv_tabview_set_act(ui_QrTabView, (tab + 1) % ((lv_tabview_t *)ui_QrTabView)->tab_cnt, LV_ANIM_ON);
        break;

        case F2_KEY_UP:
            setScreenWithIndex(MENU_SCREEN, LV_SCR_LOAD_ANIM_MOVE_RIGHT);
        break;
    }
}

void ui_MessageScreenState(lv_obj_t *self, uint8_t *key)
{
    char *title = lv_label_get_text(ui_TitleLabel);

    switch(*key)
    {
        case SECOND_DOWN_KEY:
            if ((strcmp(ARTNET_TITLE, title) == 0) || (strcmp(DMX512_TITLE, title) == 0))
                custom_ui_arc_increment(ui_DmxChArc, -1);
        break;
        case SECOND_DOWN_FAST_KEY:
            if ((strcmp(ARTNET_TITLE, title) == 0) || (strcmp(DMX512_TITLE, title) == 0))
                custom_ui_arc_increment(ui_DmxChArc, -50);
        break;
        case SECOND_UP_KEY:
            if ((strcmp(ARTNET_TITLE, title) == 0) || (strcmp(DMX512_TITLE, title) == 0))
                custom_ui_arc_increment(ui_DmxChArc, 1);
        break;
        case SECOND_UP_FAST_KEY:
            if ((strcmp(ARTNET_TITLE, title) == 0) || (strcmp(DMX512_TITLE, title) == 0))
                custom_ui_arc_increment(ui_DmxChArc, 50);
        break;
        case TURN_DOWN_KEY:
        case TURN_DOWN_FAST_KEY:
            if (strcmp(ARTNET_TITLE, title) == 0)
                custom_ui_slider_increment(ui_UniverseSlider, -1);
        break;
        case TURN_UP_KEY:
        case TURN_UP_FAST_KEY:
            if (strcmp(ARTNET_TITLE, title) == 0)
                custom_ui_slider_increment(ui_UniverseSlider, 1);
        break;
        case F1_KEY_UP:
        //case F2_KEY_UP:
            if ((strcmp(BLUETOOTH_TITLE, title) == 0) || (strcmp(ARTNET_TITLE, title) == 0) || (strcmp(DMX512_TITLE, title) == 0))
            {
                if (get_return_to_local())
                    esp_restart();
            }
        break;

        case F2_KEY_LONG:
        {
            if ((strcmp(BLUETOOTH_TITLE, title) == 0) || (strcmp(ARTNET_TITLE, title) == 0) || (strcmp(DMX512_TITLE, title) == 0))
            {
                wifiParam.wireless = WIRELESS_OFF;
                wififs.putUChar(WIRELESS_KEY, wifiParam.wireless);
                esp_restart();//here need to make a pop-up box
            }
        }
        break;
    }
}
