# Research: Minecraft Bedrock Keyboard Shortcuts & Windows Accessibility APIs

## Minecraft Bedrock Keyboard Controls (Menu Navigation)

### Standard Navigation
- **Arrow Keys** - Navigate between menu options
- **Enter/Return** - Select highlighted option
- **Tab** - Move between UI elements
- **Escape** - Go back/cancel
- **Space** - Alternative select on some menus

### Typical Main Menu Flow
```
Main Menu:
  - Play button is typically first/default selected
  - Arrow Down to Settings
  - Enter to activate selected button
```

## Windows UI Automation (UIA) API

### What It Does
- Programmatically access UI elements without coordinates
- Query element properties (name, type, state)
- Invoke actions (click, select, etc.)
- Works with accessibility framework

### PowerShell UI Automation
```powershell
# Can use .NET UIAutomationClient
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

# Get automation element for window
$automation = [System.Windows.Automation.AutomationElement]

# Find button by name
$condition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty,
    "Play"
)

# Invoke click
$button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
```

### Challenges with UWP/Minecraft
- UWP apps may have limited UIA exposure
- Game UIs often use custom rendering (not standard Windows controls)
- May not expose button elements to accessibility tree

### Alternative: Windows.Gaming.Input
- Some UWP games expose input APIs
- Might work better than UI Automation for game UIs

## Best Approach

1. **Try Arrow Keys + Enter**: Most reliable for game menus
2. **UI Automation**: If game exposes elements
3. **Windows Input Simulator**: Send virtual keyboard input with proper timing
4. **Last Resort**: Image recognition + calculated click

## Testing Strategy
1. Take screenshot of main menu
2. Send Arrow Down key (should highlight different option)
3. Take another screenshot
4. Verify highlight moved (detect visual change)
5. Send Arrow Up to return to Play
6. Send Enter
7. Verify we're on worlds list
