# Minecraft Click Methods - What Actually Works

## ✅ WORKING METHOD: Windows.Forms + mouse_event

**Script:** `mcp-servers/minecraft-automation/scripts/click_working.ps1`

**Why it works:**
- Uses `System.Windows.Forms.Cursor.Position` to move cursor (reliable positioning)
- Uses Win32 `mouse_event` API for actual click (Minecraft responds to this)
- Combination of both methods is required

**Code:**
```powershell
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($X, $Y)

Add-Type @"
using System.Runtime.InteropServices;
public class MouseClick {
    [DllImport("user32.dll")]
    public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
    private const int MOUSEEVENTF_LEFTUP = 0x04;
    
    public static void Click() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@
[MouseClick]::Click()
```

## ❌ METHODS THAT DON'T WORK

### SendInput
- **Status:** Moves cursor but doesn't click
- **Why:** Minecraft doesn't respond to SendInput clicks
- **Script:** `click_sendinput.ps1` (DO NOT USE)

### PostMessage/SendMessage
- **Status:** Returns success but no click in Minecraft
- **Why:** Minecraft doesn't process WM_LBUTTONDOWN messages properly
- **Script:** `PostMessage-Click.ps1` (DO NOT USE)

### SetCursorPos + mouse_event alone
- **Status:** Inconsistent, often doesn't click
- **Why:** SetCursorPos positioning isn't always accurate
- **Script:** `Click-Minecraft.ps1` (DO NOT USE)

## Usage in MCP Server

The MCP server's `clickAt()` function uses the working method:

```typescript
async function clickAt(x: number, y: number): Promise<void> {
  const scriptPath = 'click_working.ps1';
  await runPowerShell(`powershell -File "${scriptPath}" -X ${x} -Y ${y}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

## Validation

Tested and confirmed working:
- ✅ Click Play button (869, 471) - transitions from main_menu to worlds_list
- ✅ Detected by MCP server `detect_current_screen` tool
- ✅ Full workflow validated: detect → click → verify transition

## History

- **January 18, 2026:** WindowsFormsClick.ps1 identified as working solution
- **January 19, 2026:** Parameterized as click_working.ps1 and integrated into MCP server
- **Tested:** Multiple click methods failed before finding this combination
