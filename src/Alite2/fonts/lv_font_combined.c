/*******************************************************************************
 * Combined font wiring for Latin (Montserrat 14), Korean, and Japanese glyphs.
 *
 * This helper keeps the individual generated fonts untouched while providing
 * a single `lv_font_t` handle (`lv_font_combined_16`) that covers all glyphs.
 * When LVGL's built-in fallback support is available (>= 8.2), we chain the
 * fonts via the `.fallback` pointer. Older LVGL releases get a small wrapper
 * that manually probes each font until it finds a glyph.
 ******************************************************************************/

#ifdef LV_LVGL_H_INCLUDE_SIMPLE
#include "lvgl.h"
#else
#include "lvgl/lvgl.h"
#endif

#ifndef LV_FONT_COMBINED_16
#define LV_FONT_COMBINED_16 1
#endif

#if LV_FONT_COMBINED_16

LV_FONT_DECLARE(lv_font_montserrat_14);
LV_FONT_DECLARE(lv_font_noto_sans_kr_16);
LV_FONT_DECLARE(lv_font_noto_sans_jp_16);

/* Keep the line height/baseline aligned with the tallest source font. */
#define LV_FONT_COMBINED_LINE_HEIGHT 16
#define LV_FONT_COMBINED_BASELINE    3
#define LV_FONT_COMBINED_UNDERLINE_POS (-1)
#define LV_FONT_COMBINED_UNDERLINE_THICK 1

/* Font order: Latin -> Korean -> Japanese. */
static const lv_font_t *const lv_font_combined_chain[] = {
    &lv_font_montserrat_14,
    &lv_font_noto_sans_kr_16,
    &lv_font_noto_sans_jp_16,
};

static bool lv_font_combined_get_glyph_dsc(const lv_font_t *font,
                                           lv_font_glyph_dsc_t *dsc_out,
                                           uint32_t unicode_letter,
                                           uint32_t unicode_letter_next)
{
    LV_UNUSED(font);
    if (!dsc_out) {
        return false;
    }

    for (size_t i = 0; i < sizeof(lv_font_combined_chain) / sizeof(lv_font_combined_chain[0]); i++) {
        const lv_font_t *candidate = lv_font_combined_chain[i];
        if (!candidate || !candidate->get_glyph_dsc) {
            continue;
        }

        if (candidate->get_glyph_dsc(candidate,
                                     dsc_out,
                                     unicode_letter,
                                     unicode_letter_next)) {
            return true;
        }
    }

    return false;
}

static const uint8_t *lv_font_combined_get_glyph_bitmap(const lv_font_t *font,
                                                        uint32_t unicode_letter)
{
    LV_UNUSED(font);

    for (size_t i = 0; i < sizeof(lv_font_combined_chain) / sizeof(lv_font_combined_chain[0]); i++) {
        const lv_font_t *candidate = lv_font_combined_chain[i];
        if (!candidate || !candidate->get_glyph_bitmap) {
            continue;
        }

        const uint8_t *bitmap = candidate->get_glyph_bitmap(candidate, unicode_letter);
        if (bitmap) {
            return bitmap;
        }
    }

    return NULL;
}

const lv_font_t lv_font_combined_16 = {
    .get_glyph_dsc = lv_font_combined_get_glyph_dsc,
    .get_glyph_bitmap = lv_font_combined_get_glyph_bitmap,
    .line_height = LV_FONT_COMBINED_LINE_HEIGHT,
    .base_line = LV_FONT_COMBINED_BASELINE,
#if !(LVGL_VERSION_MAJOR == 6 && LVGL_VERSION_MINOR == 0)
    .subpx = LV_FONT_SUBPX_NONE,
#endif
#if LV_VERSION_CHECK(7, 4, 0) || LVGL_VERSION_MAJOR >= 8
    .underline_position = LV_FONT_COMBINED_UNDERLINE_POS,
    .underline_thickness = LV_FONT_COMBINED_UNDERLINE_THICK,
#endif
    .dsc = NULL,
#if LV_VERSION_CHECK(8, 2, 0) || LVGL_VERSION_MAJOR >= 9
    .fallback = NULL,
#endif
    .user_data = NULL,
};

#endif /* LV_FONT_COMBINED_16 */
