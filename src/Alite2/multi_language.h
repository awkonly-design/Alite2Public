#ifndef _MULTI_LANGUAGE_H
#define _MULTI_LANGUAGE_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stdint.h>

#include "ui.h"

enum
{
    LANG_ENG = 0,
    LANG_KOR,
    LANG_JPN,
};

typedef struct {
    lv_obj_t **obj;
    const char *kor;
    const char *jpn;
} lang_item_t;

typedef struct {
    lv_obj_t **obj;
    const char *eng;
    const char *kor;
    const char *jpn;
} active_lang_item_t;

void multi_language_apply_strings(uint8_t lang);
const lv_font_t *multi_language_get_font(uint8_t lang);
bool multi_language_find_active_text(lv_obj_t *obj, const char *eng, uint8_t lang, const char **out_text);
char *get_multi_language_format(const char *eng, uint8_t lang);

#ifdef __cplusplus
}
#endif

#endif
