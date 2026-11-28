#include "multi_language.h"

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

// How this table was built (AI prompts):
// - scan all ui_*.c files and fill string_table with every lv_obj_t that has an English string
// - add every place in the other files that changes the string of an lv_obj_t
// - translate the English strings to Korean and Japanese with a similar length, using as few distinct characters as possible
// - build Korean/Japanese fonts containing only the characters of the table (Noto Sans CJK, 4 bpp; see scripts/build_font.sh)

LV_FONT_DECLARE(lv_font_combined_16);


const lang_item_t string_table[] = {
    // Main Screen
    //{ ui_MasterLabel, "100%", "100%" },
    //{ ui_CrossLabel, "0%", "0%" },
    { &ui_Label1, "화이트             색상", "ホワイト             カラー" },
    { &ui_Label6, " 마스터 ", " マスター " },

    // Message Screen
    { &ui_TitleLabel, "무선모드", "ワイヤレス" },
    { &ui_MessageLabel, "블루투스\n연결됨", "ブルートゥース\n接続中" },

    // Menu Screen
    { &ui_MenuRoller, "화이트\n색상\n마스터/크로스\n이펙트\nDMX/유니버스\n설정\n화면회전\n정보", "ホワイト\nカラー\nマスター/クロス\nエフェクト\nDMX/ユニバス\n設定\n画面回転\n情報" },
    { &ui_FirstLabel, "F2 길게 누름", "F2長押し" },
    { &ui_BoostCheckbox, "부스트 모드", "ブーストモード" },

    // Screen Dimming
    //{ ui_CCTTabPage2, "CCT", "CCT" },
    //{ ui_CCTTabPage3, "G/M", "G/M" },
    { &ui_WhiteLabel, " 화이트 ", " ホワイト " },
    //{ ui_DimLabel, "50%", "50%" },
    //{ ui_CctLabel, "20000k", "20000k" },
    //{ ui_GmLabel, "-100%", "-100%" },
    { &ui_Label7, " 조도 ", " 調光 " },

    // Screen Effect
    { &ui_TabPage13, "트리거", "トリガ" },
    { &ui_TrigDropdown, "꺼짐\n켜짐\n블랙아웃", "オフ\nオン\nブラック" },
    { &ui_EffectPage2, "조도", "調光" },
    { &ui_EffectPage3, "속도", "スピード" },
    { &ui_EffectLabel, "이펙트", "エフェクト" },
    { &ui_EffectRoller, "모닥불\n캔들\n불꽃놀이\n플리커\n사고\n비상\n용접\nTV\n펄스\n번개", "たき火\nキャンドル\n花火大会\nフリッカー\n警察サイレン\n緊急\n溶接\nTV\nパルス\nライトニング" },
    //{ ui_EffectDimLabel, "50%", "50%" },
    //{ ui_EffectSpeedLabel, "50%", "50%" },

    // Screen Wavelength
    //{ ui_WaveDimLabel, "50%", "50%" },
    { &ui_WaveLabel, "컬러", "カラー" },
    { &ui_TabPage1, "색상", "色相" },
    { &ui_TabPage2, "채도", "彩度" },
    { &ui_TabPage3, "파장", "波長" },
    { &ui_ColorNameLabel, "연두", "黄緑" },
    { &ui_Label9, " 조도 ", " 調光 " },
    //{ ui_HueLabel, "360\xC2\xB0", "360\xC2\xB0" },
    //{ ui_SatLabel, "100%", "100%" },
    //{ ui_WaveColorLabel, "500nm", "500nm" },

    // Setup Screen
    { &ui_TabPage6, "슬롯", "スロット" },
    { &ui_SlotRoller, "슬롯 A\n슬롯 B\n슬롯 C\n슬롯 D\n슬롯 E\n슬롯 F", "スロットA\nスロットB\nスロットC\nスロットD\nスロットE\nスロットF" },
    { &ui_TabPage7, "라디오", "ラジオ" },
    { &ui_SetRadioLabel, "저장을 하려면\nF2를 길게 누르세요\n\n곧 장치가\n재부팅 됩니다.", "保存するには\nF2を長押しして\nください\nまもなくデバイスが\n再起動します" },
    { &ui_ArtnetDropdown, "끄기\n블루투스\n아트넷\n루멘\n송신자\n수신자", "オフ\nブルートゥース\nアートネット\nルーメン\n送信者\n受信者" },
    { &ui_TabPage5, "H/W", "H/W" },
    { &ui_FirmwareLabel, "선택을 적용하려면\nF2를 길게 누르세요\n\n곧 장치가\n재부팅 됩니다.", "選択を適用するには\nF2を長押しして\nください\nまもなくデバイスが\n再起動します" },
    //{ ui_VersionLabel, "1.0.0", "1.0.0" },
    { &ui_Label5, "펌웨어 버전", "ファーム版" },
    { &ui_UpdateDropdown, "F/W 복귀\n공장 초기화\n루멘 초기화\nEnglish\nKorean\nJapanese", "F/W戻す\n工場リセット\nルーメン初期化\nEnglish\nKorean\nJapanese" },
    { &ui_Label4, "설정", "設定" },

    // QR Screen
    { &ui_TabPage9, "앱", "アプリ" },
    { &ui_TabPage10, "매뉴얼", "マニュアル" },
    { &ui_TabPage11, "정보", "情報" },

    // Artnet Screen
    { &ui_TabPage4, "유니버스", "ユニバス" },
    { &ui_TabPage8, "모드", "モード" },
    { &ui_TabPage12, "비트", "ビット" },
    //{ &ui_DmxModeDropdown, "CCT+G/M\nCCT+HSI\nCCT+RGB\nRGBW\nCLAID\nFull+Effect\nPixel CCT+G/M\nPixel CCT+HSI\nPixel CCT+RGB\nPixel RGBW\nPixel CLAID\nPixel Full\nCCT+Effect\nCCT+XY\nPixel CCT+XT\nXY\nPixel XY", "CCT+G/M\nCCT+HSI\nCCT+RGB\nRGBW\nCLAID\nFull+Effect\nPixel CCT+G/M\nPixel CCT+HSI\nPixel CCT+RGB\nPixel RGBW\nPixel CLAID\nPixel Full\nCCT+Effect\nCCT+XY\nPixel CCT+XT\nXY\nPixel XY" },
    //{ ui_DmxBitsDropdown, "8 bits\n16 bits (M-L)", "8 bits\n16 bits (M-L)" },
    { &ui_RadioLabel, "채널", "チャンネル" },
    //{ ui_DmxChLabel, "1", "1" },
    { &ui_Label3, "DMX", "DMX" },
    //{ ui_UniverseLabel, " U 0 ", " U 0 " },

    { NULL, NULL, NULL }
};

const active_lang_item_t active_table[] = {
    // Battery Indicator
    { &ui_FirstLabel, "Blocked", "차단됨", "ブロック" },
    { &ui_FirstLabel, "Battery protection", "배터리 보호", "バッテリ保護" },
    { &ui_FirstLabel, "Press and hold F2", "F2 길게 누름", "F2長押し" },

    // WiFi
    { &ui_IpLabel, "Disconnected", "연결끊김", "未接続" },
    { &ui_IpLabel, "No Lumen Device\nis detected", "루멘 장치\n없음", "ルーメン機器\n未検出" },

    // Screen Event (Color names)
    { &ui_ColorNameLabel, "Deep Blue", "딥블루", "ディープ青" },
    { &ui_ColorNameLabel, "Blue", "블루", "ブルー" },
    { &ui_ColorNameLabel, "Vivid Blue", "비비드블루", "ビビッド青" },
    { &ui_ColorNameLabel, "Blue-Cyan", "블루시안", "青シアン" },
    { &ui_ColorNameLabel, "Cyan", "시안", "シアン" },
    { &ui_ColorNameLabel, "Light Cyan", "라이트시안", "ライトシアン" },
    { &ui_ColorNameLabel, "Cyan-Green", "시안그린", "シアングリーン" },
    { &ui_ColorNameLabel, "Aqua", "아쿠아", "アクア" },
    { &ui_ColorNameLabel, "Green", "그린", "グリーン" },
    { &ui_ColorNameLabel, "Vivid Green", "비비드그린", "ビビッド緑" },
    { &ui_ColorNameLabel, "Yellow-Green", "연두", "黄緑" },
    { &ui_ColorNameLabel, "Lime Green", "라임그린", "ライム緑" },
    { &ui_ColorNameLabel, "Yellowish Green", "노랑그린", "黄寄緑" },
    { &ui_ColorNameLabel, "Chartreuse", "샤르트", "シャルトリュ" },
    { &ui_ColorNameLabel, "Yellow", "옐로", "イエロー" },
    { &ui_ColorNameLabel, "Golden Yellow", "골든옐로", "ゴールド黄" },
    { &ui_ColorNameLabel, "Amber", "앰버", "アンバー" },
    { &ui_ColorNameLabel, "Orange", "오렌지", "オレンジ" },
    { &ui_ColorNameLabel, "Red-Orange", "레드오렌지", "赤オレンジ" },
    { &ui_ColorNameLabel, "Vermilion", "버밀리언", "バーミリオン" },
    { &ui_ColorNameLabel, "Red", "레드", "レッド" },
    { &ui_ColorNameLabel, "Deep Red", "딥레드", "ディープ赤" },
    { &ui_ColorNameLabel, "Magenta", "마젠타", "マゼンタ" },

    // Firmware messages
    { &ui_FirmwareLabel, "No previous\nfirmware found", "이전 펌웨어가\n없어요", "戻すファームが\nないです" },

    { &ui_MessageLabel, "USB connected\n\nPress and hold F1\nto turn on", "충전중 입니다.\nF1키를 길게\n눌러서 켜주세요", "USB接続中です。\n\nF1を長押しして\n電源を入れて\nください" },
    { &ui_MessageLabel, "Can't turn on\nLED with %4.1fV\nOnly charging", "%4.1fV 에서는\nLED를 켤 수 없고\n충전만 가능합니다.", "%4.1fVでは\nLEDを点灯できず\n充電のみ可能です" },
    { &ui_MessageLabel, "Pree and hold\nF2 to turn off\nwireless\n\nCH:%d  U:%d", "F2키를 길게 누르면\n무선모드가 종료됩니다.\n\nCH:%d  U:%d", "F2を長押しすると\nワイヤレスモードが\n終了します\n\nCH:%d  U:%d" },
    { &ui_MessageLabel, "Pree and hold\nF2 to turn off\nwireless\n\nCH:%d  U:%d\n%s", "F2키를 길게 누르면\n무선모드가 종료됩니다.\n\nCH:%d  U:%d\n%s", "F2を長押しすると\nワイヤレスモードが\n終了します\n\nCH:%d  U:%d\n%s" },

    { NULL, NULL, NULL }
};

char *get_multi_language_format(const char *eng, uint8_t lang)
{
    for (size_t i = 0; active_table[i].obj != NULL; i++) {
        if (active_table[i].eng && strcmp(active_table[i].eng, eng) == 0) {
            switch (lang) {
                case LANG_KOR:
                    return (char *)active_table[i].kor;
                case LANG_JPN:
                    return (char *)active_table[i].jpn;
                default:
                    return (char *)active_table[i].eng;
            }
        }
    }
    return (char *)eng;
}

const lv_font_t *multi_language_get_font(uint8_t lang)
{
    switch (lang) {
        case LANG_KOR:
        case LANG_JPN:
            return &lv_font_combined_16;
        default:
            return NULL;
    }
}

bool multi_language_find_active_text(lv_obj_t *obj, const char *eng, uint8_t lang, const char **out_text)
{
    if (!obj || !eng || !out_text) {
        return false;
    }

    for (size_t i = 0; active_table[i].obj != NULL; i++) {
        if (!active_table[i].obj || !active_table[i].eng) {
            continue;
        }

        lv_obj_t *target = *active_table[i].obj;
        if (!target || target != obj) {
            continue;
        }

        if (strcmp(active_table[i].eng, eng) != 0) {
            continue;
        }

        const char *localized = NULL;
        switch (lang) {
            case LANG_KOR:
                localized = active_table[i].kor;
                break;
            case LANG_JPN:
                localized = active_table[i].jpn;
                break;
            default:
                localized = active_table[i].eng;
                break;
        }

        if (!localized || localized[0] == '\0') {
            return false;
        }

        *out_text = localized;
        return true;
    }

    return false;
}

static const char *get_text_for_language(const lang_item_t *item, uint8_t lang)
{
    if (!item) {
        return NULL;
    }

    switch (lang) {
        case LANG_KOR:
            return item->kor;
        case LANG_JPN:
            return item->jpn;
        default:
            return NULL;
    }
}

static void apply_font_to_tab_buttons(lv_obj_t *tabview, const lv_font_t *font)
{
    if (!tabview || !font) {
        return;
    }

    lv_obj_t *buttons = lv_tabview_get_tab_btns(tabview);
    if (!buttons) {
        return;
    }

    lv_obj_set_style_text_font(buttons, font, LV_PART_MAIN | LV_STATE_DEFAULT);
#ifdef LV_PART_ITEMS
    lv_obj_set_style_text_font(buttons, font, LV_PART_ITEMS | LV_STATE_DEFAULT);
#endif
}

static bool update_tab_title_if_page(lv_obj_t *obj, const char *text, const lv_font_t *font)
{
    if (!obj || !text) {
        return false;
    }

    lv_obj_t *content = lv_obj_get_parent(obj);
    if (!content) {
        return false;
    }

    lv_obj_t *tabview = lv_obj_get_parent(content);
    if (!tabview) {
        return false;
    }

    if (!lv_obj_check_type(tabview, &lv_tabview_class)) {
        return false;
    }

    if (lv_tabview_get_content(tabview) != content) {
        return false;
    }

    uint32_t index = lv_obj_get_index(obj);
    lv_tabview_rename_tab(tabview, index, text);
    apply_font_to_tab_buttons(tabview, font);
    return true;
}

static void apply_font_to_dropdown(lv_obj_t *obj, const lv_font_t *font, uint8_t lang)
{
    if (!obj || !font) {
        return;
    }

    lv_obj_set_style_text_font(obj, font, LV_PART_MAIN | LV_STATE_DEFAULT);
#ifdef LV_PART_ITEMS
    lv_obj_set_style_text_font(obj, font, LV_PART_ITEMS | LV_STATE_DEFAULT);
#endif

    lv_obj_t *list = lv_dropdown_get_list(obj);
    if (list) {
        lv_obj_set_style_text_font(list, font, LV_PART_MAIN | LV_STATE_DEFAULT);
#ifdef LV_PART_ITEMS
        lv_obj_set_style_text_font(list, font, LV_PART_ITEMS | LV_STATE_DEFAULT);
#endif
    }
}

static void apply_font_to_roller(lv_obj_t *obj, const lv_font_t *font)
{
    if (!obj || !font) {
        return;
    }

    lv_obj_set_style_text_font(obj, font, LV_PART_MAIN | LV_STATE_DEFAULT);
#ifdef LV_PART_SELECTED
    lv_obj_set_style_text_font(obj, font, LV_PART_SELECTED | LV_STATE_DEFAULT);
#endif
}

static void apply_font_to_checkbox(lv_obj_t *obj, const lv_font_t *font)
{
    if (!obj || !font) {
        return;
    }

    lv_obj_set_style_text_font(obj, font, LV_PART_MAIN | LV_STATE_DEFAULT);
#ifdef LV_PART_INDICATOR
    lv_obj_set_style_text_font(obj, font, LV_PART_INDICATOR | LV_STATE_DEFAULT);
#endif
}

static void apply_font_to_label(lv_obj_t *obj, const lv_font_t *font)
{
    if (!obj || !font) {
        return;
    }

    lv_obj_set_style_text_font(obj, font, LV_PART_MAIN | LV_STATE_DEFAULT);
}

static void set_object_text(lv_obj_t *obj, const char *text, const lv_font_t *font, uint8_t lang)
{
    if (!obj || !text) {
        return;
    }

    if (update_tab_title_if_page(obj, text, font)) {
        return;
    }

    if (lv_obj_check_type(obj, &lv_label_class)) {
        apply_font_to_label(obj, font);
        lv_label_set_text(obj, text);
        return;
    }

    if (lv_obj_check_type(obj, &lv_dropdown_class)) {
        uint16_t selected = lv_dropdown_get_selected(obj);
        lv_dropdown_set_options(obj, text);
        uint16_t option_count = lv_dropdown_get_option_cnt(obj);
        if (option_count == 0) {
            return;
        }
        if (selected >= option_count) {
            selected = option_count - 1;
        }
        lv_dropdown_set_selected(obj, selected);
        apply_font_to_dropdown(obj, font, lang);
        return;
    }

    if (lv_obj_check_type(obj, &lv_roller_class)) {
        uint16_t selected = lv_roller_get_selected(obj);
        // LVGL 8.3 rollers in this project all use LV_ROLLER_MODE_NORMAL; preserve that mode explicitly.
        lv_roller_set_options(obj, text, LV_ROLLER_MODE_NORMAL);
        uint16_t option_count = lv_roller_get_option_cnt(obj);
        if (option_count == 0) {
            return;
        }
        if (selected >= option_count) {
            selected = option_count - 1;
        }
        lv_roller_set_selected(obj, selected, LV_ANIM_OFF);
        apply_font_to_roller(obj, font);
        return;
    }

    if (lv_obj_check_type(obj, &lv_checkbox_class)) {
        apply_font_to_checkbox(obj, font);
        lv_checkbox_set_text(obj, text);
        return;
    }

    // Fallback: attempt to apply font if provided.
    apply_font_to_label(obj, font);
}

static void apply_language_to_table(const lang_item_t *table, uint8_t lang)
{
    const lv_font_t *font = multi_language_get_font(lang);

    for (size_t i = 0; table[i].obj != NULL; i++) {
        if (!table[i].obj) {
            continue;
        }

        lv_obj_t *obj = *table[i].obj;
        if (!obj) {
            continue;
        }

        const char *text = get_text_for_language(&table[i], lang);
        if (!text || text[0] == '\0') {
            continue;
        }

        set_object_text(obj, text, font, lang);
    }
}

void multi_language_apply_strings(uint8_t lang)
{
    apply_language_to_table(string_table, lang);
}
