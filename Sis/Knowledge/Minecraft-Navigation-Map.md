# Minecraft Bedrock Edition - Navigation Map

## Recorded Navigation Session - January 18, 2025

### Overview
Captured 13 clicks with before/after screenshots showing a complete workflow through Minecraft's UI. This data forms the foundation for autonomous navigation capability.

### Click Sequence Analysis

#### Click 1: (747, 833) - Bottom-Center
- **Time:** 18:35:30
- **Screen Change:** 48.09%
- **Analysis:** Moderate change, bottom-center suggests a button click (likely "Settings" or similar)
- **Before:** click_1_before.png
- **After:** click_1_after.png

#### Click 2: (743, 516) - Middle-Center ⚠️ MAJOR TRANSITION
- **Time:** 18:35:42
- **Screen Change:** 99.08%
- **Analysis:** Near-complete screen change indicates entering a new section
- **Hypothesis:** Opened Settings or World Management
- **Before:** click_2_before.png
- **After:** click_2_after.png

#### Click 3: (372, 527) - Middle-Left
- **Time:** 18:36:01
- **Screen Change:** 70.76%
- **Analysis:** Significant change, middle-left position suggests sidebar or menu item
- **Hypothesis:** Selected a settings category or world from list
- **Before:** click_3_before.png
- **After:** click_3_after.png

#### Click 4: (550, 525) - Middle-Left
- **Time:** 18:36:18
- **Screen Change:** 33.09%
- **Analysis:** Moderate change, same region as Click 3
- **Hypothesis:** Expanding options or selecting submenu
- **Before:** click_4_before.png
- **After:** click_4_after.png

#### Click 5: (1637, 347) - Top-Right ⚠️ MINIMAL CHANGE
- **Time:** 18:36:31
- **Screen Change:** 12.92%
- **Analysis:** Very small change, top-right position suggests UI control
- **Hypothesis:** Scrolling, toggling, or minor adjustment
- **Before:** click_5_before.png
- **After:** click_5_after.png

#### Click 6: (1652, 217) - Top-Right ⚠️ MAJOR TRANSITION
- **Time:** 18:36:44
- **Screen Change:** 95.37%
- **Analysis:** Major screen change from top-right corner
- **Hypothesis:** Close/back button, menu toggle, or navigation control
- **Before:** click_6_before.png
- **After:** click_6_after.png

#### Click 7: (943, 602) - Middle-Center ⚠️ MAJOR TRANSITION
- **Time:** 18:36:51
- **Screen Change:** 95.87%
- **Analysis:** Another major transition from center screen
- **Hypothesis:** Main action button (Edit, Manage, Settings)
- **Before:** click_7_before.png
- **After:** click_7_after.png

#### Click 8: (19, 16) - Top-Left ⚠️ MAJOR TRANSITION
- **Time:** 18:37:03
- **Screen Change:** 88.03%
- **Analysis:** Top-left corner is classic back button location
- **Hypothesis:** Back/Exit button returning to previous screen
- **Before:** click_8_before.png
- **After:** click_8_after.png

#### Click 9: (198, 543) - Middle-Left
- **Time:** 18:37:14
- **Screen Change:** 48.06%
- **Analysis:** Moderate change from left side
- **Hypothesis:** Selecting item from list
- **Before:** click_9_before.png
- **After:** click_9_after.png

#### Click 10: (1145, 857) - Bottom-Center ⚠️ MINIMAL CHANGE
- **Time:** 18:37:22
- **Screen Change:** 18.54%
- **Analysis:** Very small change from bottom-center
- **Hypothesis:** Scrolling or minor UI interaction
- **Before:** click_10_before.png
- **After:** click_10_after.png

#### Click 11: (1146, 847) - Bottom-Center
- **Time:** 18:37:26
- **Screen Change:** 39.17%
- **Analysis:** Same region as Click 10, moderate change
- **Hypothesis:** Confirming action or selecting option
- **Before:** click_11_before.png
- **After:** click_11_after.png

#### Click 12: (896, 825) - Bottom-Center
- **Time:** 18:37:32
- **Screen Change:** 33.05%
- **Analysis:** Bottom-center, moderate change
- **Hypothesis:** Button press (Apply, OK, Confirm)
- **Before:** click_12_before.png
- **After:** click_12_after.png

#### Click 13: (863, 555) - Middle-Center ⚠️ MAJOR TRANSITION
- **Time:** 18:37:36
- **Screen Change:** 79.12%
- **Analysis:** Significant change returning to different screen
- **Hypothesis:** Final action completing the workflow
- **Before:** click_13_before.png
- **After:** click_13_after.png

## Pattern Recognition

### Major Transitions (>75% screen change)
1. Click 2 (99.08%) - Middle-Center
2. Click 6 (95.37%) - Top-Right
3. Click 7 (95.87%) - Middle-Center
4. Click 8 (88.03%) - Top-Left
5. Click 13 (79.12%) - Middle-Center

These represent primary navigation boundaries between distinct screens.

### Minor Interactions (<35% screen change)
1. Click 4 (33.09%) - Middle-Left
2. Click 5 (12.92%) - Top-Right
3. Click 10 (18.54%) - Bottom-Center
4. Click 12 (33.05%) - Bottom-Center

These represent in-screen interactions (scrolling, toggling, expanding).

### Screen Region Hotspots
- **Bottom-Center:** 4 clicks (action buttons, confirmations)
- **Middle-Left:** 3 clicks (list selections, menu items)
- **Middle-Center:** 3 clicks (main actions, buttons)
- **Top-Right:** 2 clicks (controls, close buttons)
- **Top-Left:** 1 click (back button)

## Hypothesized Workflow
Based on screen change analysis, this appears to be:

1. **Start:** In-game or main menu
2. **Click 1-2:** Navigate to Settings/World Management (99% change)
3. **Click 3-4:** Select specific world or setting
4. **Click 5:** Minor adjustment (scroll/toggle)
5. **Click 6:** Navigate to different section (95% change)
6. **Click 7:** Open specific management screen (96% change)
7. **Click 8:** Back to previous screen (88% change)
8. **Click 9:** Select item from list
9. **Click 10-11:** Scroll and select option
10. **Click 12:** Confirm action
11. **Click 13:** Return to main screen (79% change)

**Most Likely Purpose:** Unloading/managing addon on a world (based on context of addon testing workflow)

## Next Steps for Autonomous Navigation

### Immediate Tasks
1. **Screen Identification:** Build computer vision or OCR system to identify current screen
2. **State Machine:** Create navigation state machine with known transitions
3. **Coordinate Validation:** Test if recorded coordinates are reliable across sessions
4. **Screen Detection:** Identify visual markers for each screen type

### Required Capabilities
- [ ] Detect main menu
- [ ] Detect world selection screen
- [ ] Detect settings menu
- [ ] Detect world management screen
- [ ] Detect addon management interface
- [ ] Detect in-game state
- [ ] Identify navigation buttons (back, close, confirm)

### Data for Training
- 26 screenshot files with known transitions
- 13 coordinate pairs with timing data
- Screen change percentages indicating transition severity
- Region-based click patterns

## Files
- **Data:** `minecraft-navigation-data/navigation_data.json`
- **Analysis:** `minecraft-navigation-data/navigation_analysis.json`
- **Screenshots:** `minecraft-navigation-data/click_N_before.png` and `click_N_after.png` (N=1-13)
- **Recording Script:** `scripts/Record-MinecraftNavigation.ps1`
- **Analysis Script:** `scripts/Analyze-NavigationData.ps1`
