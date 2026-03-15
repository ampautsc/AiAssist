# Sis - Lessons Index

*This index stores domain-specific and historical lessons. Sis should query this file based on relevant tags before starting tasks in specific domains.*

## #general #workflow
### First Lesson - Learning
**When Applicable:** On every interaction
**Description:** Always be learning. Load the md for context.

### Second Lesson - Intentionality Over Activity
**When Applicable:** Before creating any content or taking action
**Description:** Don't add to the noise. Only create content or take actions with specific intent and clear objectives. Ask "Why are we doing this?" before doing.

### Third Lesson - Don't Steal Focus
**When Applicable:** When Creator is overwhelmed or has decision fatigue
**Description:** When Creator says "Rock on Sis", take action. Don't create decision trees. Pick the simplest, clearest path and execute.

## #minecraft
### Fifth Lesson - MINECRAFT PACK UPDATE WORKFLOW
**When Applicable:** ALWAYS when importing/updating Minecraft packs
**Description:** 
1. NEVER copy packs directly to behavior_packs/resource_packs folders.
2. NEVER edit world_behavior_packs.json on disk.
3. CORRECT WORKFLOW FOR DEVELOPMENT: Use development_behavior_packs/development_resource_packs folders for iterative work. Edit files and use /reload in-game.

## #automation #powershell #ui
### Eighth Lesson - POWERSHELL ADD-TYPE TIMING
**When Applicable:** When using Add-Type in click scripts
**Description:** Add-Type compilation must happen BEFORE cursor movement, not between cursor move and click. Order: 1. Add-Type, 2. Move cursor, 3. Pause (500ms), 4. Execute click.

### Ninth Lesson - ONE VALIDATED STEP AT A TIME WITH DIALOGS
**When Applicable:** ALWAYS when clicking buttons that trigger confirmation dialogs
**Description:** 1. Click Activate → Take screenshot → Validate dialog appeared → 2. Click Confirm on dialog → Take screenshot → Validate pack moved.

### Tenth Lesson - USE COMMON FUNCTIONS AND PROPER TIMING
**When Applicable:** ALWAYS when clicking, ALWAYS when there are common functions
**Description:** Always use common functions when they exist. After moving cursor, ALWAYS sleep 2 seconds before clicking.