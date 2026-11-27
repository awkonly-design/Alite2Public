// Default property sets of the widgets used by the Alite2 UI (used when a widget is added).
export const TEMPLATES = {
 "SCREEN": {
  "isPage": true,
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Screen",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "SCREEN/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 230,
    "strtype": "OBJECT/Scrollable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "SCREEN/Screen",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "SCREEN/Temporary",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1040,
    "strtype": "SCREEN/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Text",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.SCROLLBAR",
    "childs": [],
    "nid": 1050,
    "strtype": "SCREEN/Style_scrollbar",
    "strval": "lv.PART.SCROLLBAR, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "SCREEN",
  "children": []
 },
 "ARC": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Arc",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     -160,
     40
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 17,
    "strtype": "OBJECT/Size",
    "intarray": [
     140,
     140
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "ARC/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "ARC/Arc",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "ARC/Range",
    "intarray": [
     0,
     100
    ],
    "InheritedType": 7
   },
   {
    "nid": 1030,
    "strtype": "ARC/Value",
    "integer": 50,
    "InheritedType": 6
   },
   {
    "nid": 1040,
    "strtype": "ARC/Bg_angles",
    "intarray": [
     120,
     60
    ],
    "InheritedType": 7
   },
   {
    "nid": 1050,
    "strtype": "ARC/Mode",
    "strval": "NORMAL",
    "InheritedType": 3
   },
   {
    "nid": 1060,
    "strtype": "ARC/Rotation",
    "InheritedType": 6
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1070,
    "strtype": "ARC/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Arc, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.INDICATOR",
    "childs": [],
    "nid": 1080,
    "strtype": "ARC/Style_indicator",
    "strval": "lv.PART.INDICATOR, Rectangle, Pad, Arc",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.KNOB",
    "childs": [],
    "nid": 1090,
    "strtype": "ARC/Style_knob",
    "strval": "lv.PART.KNOB, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "ARC",
  "children": []
 },
 "BAR": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Bar",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     0,
     -50
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 17,
    "strtype": "OBJECT/Size",
    "intarray": [
     440,
     20
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "BOTTOM_MID",
    "InheritedType": 3
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "BAR/Hidden",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "BAR/Bar",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "BAR/Range",
    "intarray": [
     0,
     100
    ],
    "InheritedType": 7
   },
   {
    "nid": 1030,
    "strtype": "BAR/Value",
    "InheritedType": 6
   },
   {
    "nid": 1050,
    "strtype": "BAR/Mode",
    "strval": "NORMAL",
    "InheritedType": 3
   },
   {
    "nid": 1050,
    "strtype": "BAR/Value_start",
    "InheritedType": 6
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1070,
    "strtype": "BAR/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Anim1, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.INDICATOR",
    "childs": [],
    "nid": 1080,
    "strtype": "BAR/Style_indicator",
    "strval": "lv.PART.INDICATOR, Rectangle",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "BAR",
  "children": []
 },
 "CHECKBOX": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Checkbox",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     0,
     40
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 51,
    "strtype": "OBJECT/Size",
    "intarray": [
     1,
     1
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "CHECKBOX/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 260,
    "strtype": "OBJECT/Scroll_on_focus",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 330,
    "strtype": "OBJECT/Checked",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1010,
    "strtype": "CHECKBOX/Checkbox",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "CHECKBOX/Title",
    "strval": "Smoother",
    "InheritedType": 10
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1030,
    "strtype": "CHECKBOX/Style_main",
    "strval": "lv.PART.MAIN, Text, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.INDICATOR",
    "childs": [],
    "nid": 1040,
    "strtype": "CHECKBOX/Style_bullet",
    "strval": "lv.PART.INDICATOR, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "CHECKBOX",
  "children": []
 },
 "DROPDOWN": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Dropdown",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     0,
     -20
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 49,
    "strtype": "OBJECT/Size",
    "intarray": [
     130,
     1
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "DROPDOWN/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 260,
    "strtype": "OBJECT/Scroll_on_focus",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "DROPDOWN/Dropdown",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "DROPDOWN/Options",
    "strval": "8 bits\\n16 bits",
    "InheritedType": 10
   },
   {
    "nid": 1030,
    "strtype": "DROPDOWN/List_align",
    "strval": "BOTTOM",
    "InheritedType": 3
   },
   {
    "nid": 1040,
    "strtype": "DROPDOWN/Show_selected",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1050,
    "strtype": "DROPDOWN/Base_text",
    "strval": "",
    "InheritedType": 10
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1060,
    "strtype": "DROPDOWN/Style_main",
    "strval": "lv.PART.MAIN, Text, Rectangle, Pad, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.INDICATOR",
    "childs": [],
    "nid": 1070,
    "strtype": "DROPDOWN/Style_indicator",
    "strval": "lv.PART.INDICATOR, Text",
    "InheritedType": 11
   },
   {
    "part": " lv.PART.MAIN",
    "childs": [],
    "nid": 1080,
    "strtype": "DROPDOWN/Style_list_main",
    "strval": "{\"python\":\"{0}.get_list()\",\"c\":\"lv_dropdown_get_list({0})\"} lv.PART.MAIN, Text, Rectangle, Pad",
    "InheritedType": 11
   },
   {
    "part": " lv.PART.SCROLLBAR",
    "childs": [],
    "nid": 1090,
    "strtype": "DROPDOWN/Style_list_scrollbar",
    "strval": "{\"python\":\"{0}.get_list()\",\"c\":\"lv_dropdown_get_list({0})\"} lv.PART.SCROLLBAR, Rectangle, Pad",
    "InheritedType": 11
   },
   {
    "part": " lv.PART.SELECTED",
    "childs": [],
    "nid": 1100,
    "strtype": "DROPDOWN/Style_list_selected",
    "strval": "{\"python\":\"{0}.get_list()\",\"c\":\"lv_dropdown_get_list({0})\"} lv.PART.SELECTED, Text, Rectangle",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "DROPDOWN",
  "children": []
 },
 "IMAGE": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Image",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     10,
     10
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 51,
    "strtype": "OBJECT/Size",
    "intarray": [
     1,
     1
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "TOP_LEFT",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "IMAGE/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 110,
    "strtype": "OBJECT/Clickable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 150,
    "strtype": "OBJECT/Adv_hittest",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 230,
    "strtype": "OBJECT/Scrollable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "IMAGE/Image",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "IMAGE/Asset",
    "strval": "assets/line3.png",
    "InheritedType": 5
   },
   {
    "nid": 1030,
    "flags": 16,
    "strtype": "IMAGE/Pivot",
    "intarray": [
     0,
     0
    ],
    "InheritedType": 7
   },
   {
    "nid": 1040,
    "strtype": "IMAGE/Rotation",
    "InheritedType": 6
   },
   {
    "nid": 1050,
    "strtype": "IMAGE/Scale",
    "integer": 256,
    "InheritedType": 6
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1060,
    "strtype": "IMAGE/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Image, Transform",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "IMAGE",
  "children": []
 },
 "LABEL": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Label",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     -160,
     40
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 51,
    "strtype": "OBJECT/Size",
    "intarray": [
     1,
     1
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "LABEL/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 110,
    "strtype": "OBJECT/Clickable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "LABEL/Label",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "LABEL/Long_mode",
    "strval": "WRAP",
    "InheritedType": 3
   },
   {
    "nid": 1030,
    "strtype": "LABEL/Text",
    "strval": "50%",
    "InheritedType": 10
   },
   {
    "nid": 1040,
    "strtype": "LABEL/Recolor",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1050,
    "strtype": "LABEL/Style_main",
    "strval": "lv.PART.MAIN, Text, Rectangle, Pad, Transform",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "LABEL",
  "children": []
 },
 "PANEL": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Panel",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     160,
     -20
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 17,
    "strtype": "OBJECT/Size",
    "intarray": [
     140,
     52
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "PANEL/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 230,
    "strtype": "OBJECT/Scrollable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1010,
    "strtype": "PANEL/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Text, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.SCROLLBAR",
    "childs": [],
    "nid": 1020,
    "strtype": "PANEL/Style_scrollbar",
    "strval": "lv.PART.SCROLLBAR, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "PANEL",
  "children": []
 },
 "ROLLER": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Roller",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     -160,
     10
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 17,
    "strtype": "OBJECT/Size",
    "intarray": [
     120,
     160
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "TOP_MID",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "ROLLER/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "ROLLER/Roller",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "ROLLER/Options",
    "strval": "Wired DMX\\nLumen Radio\\nArtnet",
    "InheritedType": 10
   },
   {
    "nid": 1030,
    "strtype": "ROLLER/Mode",
    "strval": "NORMAL",
    "InheritedType": 3
   },
   {
    "nid": 1040,
    "strtype": "ROLLER/Selected",
    "InheritedType": 6
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1050,
    "strtype": "ROLLER/Style_main",
    "strval": "lv.PART.MAIN, Text, Rectangle, Pad, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.SELECTED",
    "childs": [],
    "nid": 1060,
    "strtype": "ROLLER/Style_selected",
    "strval": "lv.PART.SELECTED, Text, Rectangle",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "ROLLER",
  "children": []
 },
 "SLIDER": {
  "properties": [
   {
    "nid": 1283156790,
    "strtype": "OBJECT/Name",
    "strval": "Slider",
    "InheritedType": 10
   },
   {
    "nid": 954365600,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 371058123,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": -1285188701,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 51695302,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     0,
     0
    ],
    "InheritedType": 7
   },
   {
    "nid": 1592735284,
    "flags": 17,
    "strtype": "OBJECT/Size",
    "intarray": [
     130,
     10
    ],
    "InheritedType": 7
   },
   {
    "nid": 1621568183,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 75,
    "strtype": "OBJECT/Extend_click_area",
    "InheritedType": 6
   },
   {
    "nid": -881048607,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": -1791050499,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": -702249346,
    "strtype": "SLIDER/Slider",
    "InheritedType": 1
   },
   {
    "nid": 1993630350,
    "strtype": "SLIDER/Range",
    "intarray": [
     1700,
     20000
    ],
    "InheritedType": 7
   },
   {
    "nid": 3266026,
    "strtype": "SLIDER/Mode",
    "strval": "NORMAL",
    "InheritedType": 3
   },
   {
    "nid": 406203957,
    "strtype": "SLIDER/Value",
    "integer": 5600,
    "InheritedType": 6
   },
   {
    "nid": 347682721,
    "strtype": "SLIDER/Value_left",
    "InheritedType": 6
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 2056527875,
    "strtype": "SLIDER/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.INDICATOR",
    "childs": [],
    "nid": -1635235719,
    "strtype": "SLIDER/Style_indicator",
    "strval": "lv.PART.INDICATOR, Rectangle",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.KNOB",
    "childs": [],
    "nid": 633493805,
    "strtype": "SLIDER/Style_knob",
    "strval": "lv.PART.KNOB, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "SLIDER",
  "children": []
 },
 "SPINNER": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Spinner",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     0,
     0
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 17,
    "strtype": "OBJECT/Size",
    "intarray": [
     60,
     60
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "CENTER",
    "InheritedType": 3
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "OBJECT/Hidden",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 110,
    "strtype": "OBJECT/Clickable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "flags": 1048576,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1010,
    "strtype": "SPINNER/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Arc, Pad, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.INDICATOR",
    "childs": [],
    "nid": 1020,
    "strtype": "SPINNER/Style_indicator",
    "strval": "lv.PART.INDICATOR, Arc",
    "InheritedType": 11
   },
   {
    "nid": 1030,
    "strtype": "SPINNER/Spinner",
    "InheritedType": 1
   }
  ],
  "saved_objtypeKey": "SPINNER",
  "children": []
 },
 "TABVIEW": {
  "properties": [
   {
    "nid": 10,
    "strtype": "OBJECT/Name",
    "strval": "Tabview",
    "InheritedType": 10
   },
   {
    "nid": 20,
    "strtype": "OBJECT/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 30,
    "strtype": "OBJECT/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 40,
    "strtype": "OBJECT/Transform",
    "InheritedType": 1
   },
   {
    "nid": 50,
    "flags": 17,
    "strtype": "OBJECT/Position",
    "intarray": [
     0,
     0
    ],
    "InheritedType": 7
   },
   {
    "nid": 60,
    "flags": 18,
    "strtype": "OBJECT/Size",
    "intarray": [
     100,
     220
    ],
    "InheritedType": 7
   },
   {
    "nid": 70,
    "strtype": "OBJECT/Align",
    "strval": "BOTTOM_MID",
    "InheritedType": 3
   },
   {
    "nid": 90,
    "flags": 1048576,
    "strtype": "OBJECT/Flags",
    "InheritedType": 1
   },
   {
    "nid": 100,
    "strtype": "TABVIEW/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 225,
    "strtype": "OBJECT/Scrolling",
    "InheritedType": 1
   },
   {
    "nid": 230,
    "strtype": "OBJECT/Scrollable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 240,
    "strtype": "OBJECT/Scroll_elastic",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 250,
    "strtype": "OBJECT/Scroll_momentum",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 270,
    "strtype": "OBJECT/Scroll_chain",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 300,
    "strtype": "OBJECT/Scrollbar_mode",
    "strval": "OFF",
    "InheritedType": 3
   },
   {
    "nid": 310,
    "strtype": "OBJECT/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 314,
    "strtype": "OBJECT/Scroll_snap_x",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 315,
    "strtype": "OBJECT/Scroll_snap_y",
    "strval": "NONE",
    "InheritedType": 3
   },
   {
    "nid": 320,
    "flags": 1048576,
    "strtype": "OBJECT/States",
    "InheritedType": 1
   },
   {
    "nid": 1010,
    "strtype": "TABVIEW/Tabview",
    "InheritedType": 1
   },
   {
    "nid": 1020,
    "strtype": "TABVIEW/Tab_position",
    "strval": "BOTTOM",
    "InheritedType": 3
   },
   {
    "nid": 1030,
    "strtype": "TABVIEW/Tab_size",
    "integer": 35,
    "InheritedType": 6
   },
   {
    "nid": 1040,
    "strtype": "TABVIEW/Tabpages",
    "InheritedType": 1
   },
   {
    "nid": 1050,
    "strtype": "TABVIEW/Children",
    "strval": "",
    "InheritedType": 15
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1060,
    "strtype": "TABVIEW/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Text, Transform",
    "InheritedType": 11
   },
   {
    "part": " lv.PART.MAIN",
    "childs": [],
    "nid": 1070,
    "strtype": "TABVIEW/Style_buttons_main",
    "strval": "{\"python\":\"{0}.get_tab_btns()\",\"c\":\"lv_tabview_get_tab_btns({0})\"} lv.PART.MAIN, Text, Rectangle, Pad",
    "InheritedType": 11
   },
   {
    "part": " lv.PART.ITEMS",
    "childs": [],
    "nid": 1080,
    "strtype": "TABVIEW/Style_buttons_items",
    "strval": "{\"python\":\"{0}.get_tab_btns()\",\"c\":\"lv_tabview_get_tab_btns({0})\"} lv.PART.ITEMS, Text, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "TABVIEW",
  "children": []
 },
 "TABPAGE": {
  "properties": [
   {
    "nid": 1000275,
    "strtype": "TABPAGE/Name",
    "strval": "Tabpage",
    "InheritedType": 10
   },
   {
    "nid": 1000276,
    "strtype": "TABPAGE/Layout",
    "InheritedType": 1
   },
   {
    "Flow": 0,
    "Wrap": false,
    "Reversed": false,
    "MainAlignment": 0,
    "CrossAlignment": 0,
    "TrackAlignment": 0,
    "LayoutType": 0,
    "nid": 1000277,
    "strtype": "TABPAGE/Layout_type",
    "strval": "No_layout",
    "InheritedType": 13
   },
   {
    "nid": 1000278,
    "flags": 1048576,
    "strtype": "TABPAGE/Flags",
    "InheritedType": 1
   },
   {
    "nid": 1000279,
    "strtype": "TABPAGE/Hidden",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000280,
    "strtype": "TABPAGE/Clickable",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000281,
    "strtype": "TABPAGE/Checkable",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000282,
    "strtype": "TABPAGE/Press_lock",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000283,
    "strtype": "TABPAGE/Click_focusable",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000284,
    "strtype": "TABPAGE/Adv_hittest",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000285,
    "strtype": "TABPAGE/Ignore_layout",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000286,
    "strtype": "TABPAGE/Floating",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000287,
    "strtype": "TABPAGE/Overflow_visible",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000288,
    "strtype": "TABPAGE/Flex_in_new_track",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000289,
    "strtype": "TABPAGE/Event_bubble",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000290,
    "strtype": "TABPAGE/Gesture_bubble",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000291,
    "strtype": "TABPAGE/Snappable",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000292,
    "strtype": "TABPAGE/Scrollable",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000293,
    "strtype": "TABPAGE/Scroll_elastic",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000294,
    "strtype": "TABPAGE/Scroll_momentum",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000295,
    "strtype": "TABPAGE/Scroll_on_focus",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000296,
    "strtype": "TABPAGE/Scroll_chain",
    "strval": "True",
    "InheritedType": 2
   },
   {
    "nid": 1000297,
    "strtype": "TABPAGE/Scroll_with_arrow",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000298,
    "strtype": "TABPAGE/Scroll_one",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000299,
    "strtype": "TABPAGE/Scrollbar_mode",
    "strval": "AUTO",
    "InheritedType": 3
   },
   {
    "nid": 1000300,
    "strtype": "TABPAGE/Scroll_direction",
    "strval": "ALL",
    "InheritedType": 3
   },
   {
    "nid": 1000301,
    "flags": 1048576,
    "strtype": "TABPAGE/States",
    "InheritedType": 1
   },
   {
    "nid": 1000302,
    "strtype": "TABPAGE/Checked",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000303,
    "strtype": "TABPAGE/Disabled",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000304,
    "strtype": "TABPAGE/Focused",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000305,
    "strtype": "TABPAGE/Pressed",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000306,
    "strtype": "TABPAGE/User_1",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000307,
    "strtype": "TABPAGE/User_2",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000308,
    "strtype": "TABPAGE/User_3",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000309,
    "strtype": "TABPAGE/User_4",
    "strval": "False",
    "InheritedType": 2
   },
   {
    "nid": 1000310,
    "strtype": "TABPAGE/TabPage",
    "InheritedType": 1
   },
   {
    "nid": 1000311,
    "strtype": "TABPAGE/Title",
    "strval": "HSI",
    "InheritedType": 10
   },
   {
    "part": "lv.PART.MAIN",
    "childs": [],
    "nid": 1000312,
    "strtype": "TABPAGE/Style_main",
    "strval": "lv.PART.MAIN, Rectangle, Pad, Text, Transform",
    "InheritedType": 11
   },
   {
    "part": "lv.PART.SCROLLBAR",
    "childs": [],
    "nid": 1000313,
    "strtype": "TABPAGE/Style_scrollbar",
    "strval": "lv.PART.SCROLLBAR, Rectangle, Pad",
    "InheritedType": 11
   }
  ],
  "saved_objtypeKey": "TABPAGE",
  "children": []
 }
};
