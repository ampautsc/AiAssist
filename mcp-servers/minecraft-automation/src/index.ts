#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, appendFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);
const DEBUG_LOG = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\mcp-servers\\minecraft-automation\\debug.log';

function log(message: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(DEBUG_LOG, `[${timestamp}] ${message}\n`, 'utf8');
}

const server = new Server(
  {
    name: 'minecraft-automation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Execute PowerShell command and return output
 */
async function runPowerShell(command: string): Promise<string> {
  const tempFile = join(tmpdir(), `minecraft-mcp-${Date.now()}.ps1`);
  writeFileSync(tempFile, command, 'utf8');
  try {
    const { stdout, stderr } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`);
    if (stderr && stderr.trim().length > 0) {
      console.error('PowerShell stderr:', stderr);
    }
    return stdout.trim();
  } finally {
    // Clean up temp file
    try {
      await execAsync(`del "${tempFile}"`);
    } catch {}
  }
}


/**
 * Check if Minecraft is running
 */
async function isMinecraftRunning(): Promise<boolean> {
  try {
    const output = await runPowerShell('Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1');
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Start Minecraft
 */
async function startMinecraft(): Promise<void> {
  await runPowerShell('Start-Process "minecraft://"; Start-Sleep -Seconds 15');
}

/**
 * Activate and maximize Minecraft window - with verification
 */
async function activateMinecraft(): Promise<void> {
  const script = `
$mc = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1
if (-not $mc) {
  Write-Error "Minecraft process not found"
  exit 1
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr ProcessId);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
}
"@

$hwnd = $mc.MainWindowHandle

# Restore if minimized
if ([WinAPI]::IsIconic($hwnd)) {
    [WinAPI]::ShowWindow($hwnd, 9) | Out-Null
    Start-Sleep -Milliseconds 500
}

# Maximize
[WinAPI]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 200

# Aggressive focus stealing
$currentThread = [WinAPI]::GetCurrentThreadId()
$foreground = [WinAPI]::GetForegroundWindow()
$foregroundThread = [WinAPI]::GetWindowThreadProcessId($foreground, [IntPtr]::Zero)

# Attach to foreground thread
[WinAPI]::AttachThreadInput($currentThread, $foregroundThread, $true) | Out-Null

# Try to set foreground multiple times
for ($i = 0; $i -lt 5; $i++) {
    [WinAPI]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 100
    $current = [WinAPI]::GetForegroundWindow()
    if ($current -eq $hwnd) {
        break
    }
}

# Detach
[WinAPI]::AttachThreadInput($currentThread, $foregroundThread, $false) | Out-Null

# Verify activation
Start-Sleep -Seconds 2
$final = [WinAPI]::GetForegroundWindow()
if ($final -eq $hwnd) {
    Write-Host "SUCCESS: Minecraft activated"
} else {
    Write-Warning "WARNING: Minecraft may not be in focus"
}
`;
  await runPowerShell(script);
}

/**
 * Take screenshot - Windows+PrintScreen saves full screen to Pictures\Screenshots
 */
async function takeScreenshot(filename: string): Promise<void> {
  log(`takeScreenshot: Starting for ${filename}`);
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeyHelper {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    public const int VK_LWIN = 0x5B;
    public const int VK_SNAPSHOT = 0x2C;
    public const int KEYEVENTF_KEYUP = 0x2;
}
"@

# Press Windows+PrintScreen
[KeyHelper]::keybd_event([KeyHelper]::VK_LWIN, 0, 0, 0)
[KeyHelper]::keybd_event([KeyHelper]::VK_SNAPSHOT, 0, 0, 0)
Start-Sleep -Milliseconds 100
[KeyHelper]::keybd_event([KeyHelper]::VK_SNAPSHOT, 0, [KeyHelper]::KEYEVENTF_KEYUP, 0)
[KeyHelper]::keybd_event([KeyHelper]::VK_LWIN, 0, [KeyHelper]::KEYEVENTF_KEYUP, 0)
Start-Sleep -Milliseconds 1000

# Find the most recent screenshot in Pictures\Screenshots
$screenshotsPath = [Environment]::GetFolderPath("MyPictures") + "\\Screenshots"
$latestFile = Get-ChildItem $screenshotsPath -Filter "*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestFile) {
    Copy-Item $latestFile.FullName "${filename}" -Force
    Write-Host "Screenshot copied"
} else {
    Write-Error "No screenshot found"
}
`;
  try {
    const result = await runPowerShell(script);
    log(`takeScreenshot: Success - ${result}`);
  } catch (error) {
    log(`takeScreenshot: Error - ${error}`);
    throw error;
  }
}

/**
 * Validate screen using Python OCR
 */
async function validateScreen(screenshotPath: string): Promise<string> {
  log(`validateScreen: Starting for ${screenshotPath}`);
  const scriptPath = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\mcp-servers\\minecraft-automation\\scripts\\validate_screen.py';
  const pythonPath = 'C:/Users/ampau/source/AiAssist/AiAssist/.venv/Scripts/python.exe';
  
  try {
    const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}" "${screenshotPath}"`);
    if (stderr) {
      log(`validateScreen: Python stderr - ${stderr}`);
    }
    const result = stdout.trim();
    log(`validateScreen: Result - '${result}'`);
    return result;
  } catch (error) {
    log(`validateScreen: Error - ${error}`);
    return 'unknown';
  }
}

/**
 * Click at coordinates using working Click-Minecraft.ps1 script
 */
/**
 * Click at specific coordinates using Windows.Forms + mouse_event (verified working method)
 */
/**
 * Get DPI scale factor for coordinate conversion
 */
async function getScaleFactor(): Promise<number> {
  // Default to 1.5 for 150% scaling - the most common case
  // If this fails, we'll still have a working value
  try {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ScreenInfo {
    [DllImport("shcore.dll")] 
    public static extern int GetScaleFactorForMonitor(IntPtr hMon, out int pScale);
    [DllImport("user32.dll")] 
    public static extern IntPtr MonitorFromPoint(POINT pt, uint dwFlags);
    [StructLayout(LayoutKind.Sequential)] 
    public struct POINT { public int X; public int Y; }
}
"@
$pt = New-Object ScreenInfo+POINT
$monitor = [ScreenInfo]::MonitorFromPoint($pt, 2)
$scale = 0
[ScreenInfo]::GetScaleFactorForMonitor($monitor, [ref]$scale)
Write-Host $scale
`;
    const result = await runPowerShell(script);
    const scalePercent = parseInt(result.trim());
    if (isNaN(scalePercent) || scalePercent === 0) {
      log(`getScaleFactor: Failed to parse scale, using default 1.5. Raw result: '${result}'`);
      return 1.5;
    }
    const scaleFactor = scalePercent / 100.0;
    log(`getScaleFactor: Scale factor ${scaleFactor} (${scalePercent}%)`);
    return scaleFactor;
  } catch (error) {
    log(`getScaleFactor: Error getting scale factor, using default 1.5. Error: ${error}`);
    return 1.5;
  }
}

/**
 * Find text on screen using OCR and return Windows logical coordinates
 * Automatically handles DPI scaling conversion
 */
async function findTextCoordinates(searchText: string): Promise<{ x: number; y: number } | null> {
  const workspacePath = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist';
  const screenshotPath = `${workspacePath}\\find_text_screenshot.png`;
  const ocrScriptPath = `${workspacePath}\\scripts\\ocr_text.py`;
  
  // Take screenshot
  await takeScreenshot(screenshotPath);
  
  // Run OCR to find text
  const ocrCommand = `python "${ocrScriptPath}" "${screenshotPath}" "${searchText}"`;
  const output = await runPowerShell(ocrCommand);
  
  // Parse OCR output: format is "left,top,width,height,confidence,text"
  const lines = output.split('\n').filter(line => line.includes(searchText));
  if (lines.length === 0) {
    log(`findTextCoordinates: Text '${searchText}' not found`);
    return null;
  }
  
  // Use first match
  const parts = lines[0].split(',');
  const left = parseInt(parts[0]);
  const top = parseInt(parts[1]);
  const width = parseInt(parts[2]);
  const height = parseInt(parts[3]);
  
  // Calculate center of text box in physical pixels
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  
  // Convert from physical pixels to logical Windows coordinates
  const scaleFactor = await getScaleFactor();
  const windowsX = Math.round(centerX / scaleFactor);
  const windowsY = Math.round(centerY / scaleFactor);
  
  log(`findTextCoordinates: Found '${searchText}' at physical (${centerX}, ${centerY}), Windows logical (${windowsX}, ${windowsY}), scale=${scaleFactor}`);
  return { x: windowsX, y: windowsY };
}

/**
 * Switch focus back to VS Code
 */
async function switchToVSCode(): Promise<void> {
  log('switchToVSCode: Switching focus to VS Code');
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$vscode = Get-Process | Where-Object {$_.ProcessName -eq "Code"} | Select-Object -First 1
if ($vscode) {
    # Use Alt+Tab key simulation which Windows always allows
    [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")
    Start-Sleep -Milliseconds 500
    Write-Host "Sent Alt+Tab"
} else {
    Write-Host "VS Code not running"
}
`;
  await runPowerShell(script);
  log('switchToVSCode: Complete');
}

async function clickAt(x: number, y: number): Promise<void> {
  log(`clickAt: Clicking at (${x}, ${y})`);
  const scriptPath = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\mcp-servers\\minecraft-automation\\scripts\\click_working.ps1';
  await runPowerShell(`& "${scriptPath}" -X ${x} -Y ${y}`);
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds after click
  log(`clickAt: Click completed, waited 5 seconds`);
}

/**
 * Coordinates for navigation - from recorded clicks
 */
const COORDS = {
  PLAY_BUTTON: { x: 869, y: 471 },           // Main menu Play button
  SETTINGS_BUTTON: { x: 960, y: 650 },      // Main menu Settings button (estimate)
  WORLD_EDIT_BUTTON: { x: 395, y: 527 },    // Edit button on first world tile
  WORLD_TILE_LOAD: { x: 198, y: 543 },      // Click world tile itself to load
  EXPAND_MENU: { x: 553, y: 850 },          // Expand settings menu in Edit World
  RESOURCE_PACKS: { x: 320, y: 787 },       // Resource Packs option
  BEHAVIOR_PACKS: { x: 200, y: 1266 },      // Behavior Packs option (after scroll, 2560x1440)
  ACTIVATE_PACK: { x: 2200, y: 450 },       // Activate button for available packs (right side)
  CONFIRM_UPDATE: { x: 818, y: 635 },       // Confirm "Update world?" dialog
  BACK_BUTTON: { x: 19, y: 16 },            // Back arrow top-left
  ESC_MENU: { x: 960, y: 540 },             // Center of screen for ESC menu
  SETTINGS_IN_GAME: { x: 960, y: 600 },     // Settings button in pause menu
};

/**
 * Perform validated click with all safety checks
 */
async function doValidatedClick(
  x: number,
  y: number,
  expectedBefore: string,
  expectedAfter: string
): Promise<{ success: boolean; message: string }> {
  log(`doValidatedClick: START (${x}, ${y}) expecting ${expectedBefore} -> ${expectedAfter}`);
  const workspacePath = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist';
  const beforePath = `${workspacePath}\\before_click.png`;
  const afterPath = `${workspacePath}\\after_click.png`;

  try {
    // Ensure Minecraft running and active
    log('doValidatedClick: Checking if Minecraft is running');
    if (!(await isMinecraftRunning())) {
      log('doValidatedClick: Starting Minecraft');
      await startMinecraft();
    }
    log('doValidatedClick: Activating Minecraft');
    await activateMinecraft();

    // Validate before
    await takeScreenshot(beforePath);
    const currentScreen = await validateScreen(beforePath);
    if (currentScreen !== expectedBefore) {
      return {
        success: false,
        message: `Expected screen '${expectedBefore}' but on '${currentScreen}'`,
      };
    }

    // Click
    await clickAt(x, y);

    // Validate after
    await takeScreenshot(afterPath);
    const newScreen = await validateScreen(afterPath);
    if (newScreen !== expectedAfter) {
      return {
        success: false,
        message: `Expected screen '${expectedAfter}' after click but on '${newScreen}'`,
      };
    }

    return {
      success: true,
      message: `Clicked (${x}, ${y}), transitioned ${expectedBefore} → ${expectedAfter}`,
    };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'detect_current_screen',
        description: 'Detect current Minecraft screen. Activates Minecraft, takes screenshot, validates screen type.',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'minecraft_validated_click',
        description: 'Low-level click with full validation. Ensures Minecraft running/active, validates screen before/after click.',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate to click' },
            y: { type: 'number', description: 'Y coordinate to click' },
            expected_screen_before: { type: 'string', description: 'Expected screen before (main_menu, worlds_list, world_edit, in_game)' },
            expected_screen_after: { type: 'string', description: 'Expected screen after' },
          },
          required: ['x', 'y', 'expected_screen_before', 'expected_screen_after'],
        },
      },
      {
        name: 'click_play',
        description: 'From Main Menu, click Play button to go to Worlds List',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'click_settings',
        description: 'From Main Menu, click Settings button',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'edit_world',
        description: 'From Worlds List, click Edit button on specified world',
        inputSchema: {
          type: 'object',
          properties: {
            world_index: { type: 'number', description: 'Index of world (0 for first world tile)', default: 0 },
          },
        },
      },
      {
        name: 'launch_world',
        description: 'From Worlds List, click world tile to launch it',
        inputSchema: {
          type: 'object',
          properties: {
            world_index: { type: 'number', description: 'Index of world to launch (0 for first)', default: 0 },
          },
        },
      },
      {
        name: 'scroll_down',
        description: 'Scroll down in current screen (e.g., in Edit World settings)',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Scroll amount (default 3)', default: 3 },
          },
        },
      },
      {
        name: 'select_behavior_packs',
        description: 'From Edit World, select Behavior Packs option',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'activate_behavior_pack',
        description: 'In Behavior Packs screen, activate specified pack',
        inputSchema: {
          type: 'object',
          properties: {
            pack_name: { type: 'string', description: 'Name of behavior pack to activate' },
          },
          required: ['pack_name'],
        },
      },
      {
        name: 'deactivate_behavior_pack',
        description: 'In Behavior Packs screen, deactivate specified pack',
        inputSchema: {
          type: 'object',
          properties: {
            pack_name: { type: 'string', description: 'Name of behavior pack to deactivate' },
          },
          required: ['pack_name'],
        },
      },
      {
        name: 'select_resource_packs',
        description: 'From Edit World, select Resource Packs option',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'activate_resource_pack',
        description: 'In Resource Packs screen, activate specified pack',
        inputSchema: {
          type: 'object',
          properties: {
            pack_name: { type: 'string', description: 'Name of resource pack to activate' },
            confirm_update: { type: 'boolean', description: 'Auto-confirm "Update world?" dialog', default: true },
          },
          required: ['pack_name'],
        },
      },
      {
        name: 'deactivate_resource_pack',
        description: 'In Resource Packs screen, deactivate specified pack',
        inputSchema: {
          type: 'object',
          properties: {
            pack_name: { type: 'string', description: 'Name of resource pack to deactivate' },
          },
          required: ['pack_name'],
        },
      },
      {
        name: 'open_content_log',
        description: 'From in-game, open Settings, scroll to Creator section, open Content Log',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'go_back',
        description: 'Click back button (top-left arrow) to return to previous screen',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  
  try {
  // Detect current screen
  if (toolName === 'detect_current_screen') {
    log('detect_current_screen: START');
    const workspacePath = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist';
    const screenshotPath = `${workspacePath}\\current_screen.png`;
    
    try {
      // Ensure Minecraft running and active
      log('detect_current_screen: Checking if Minecraft is running');
      if (!(await isMinecraftRunning())) {
        return { content: [{ type: 'text', text: 'ERROR: Minecraft is not running' }] };
      }
      
      log('detect_current_screen: Activating Minecraft');
      await activateMinecraft();
      
      // Wait for Minecraft to fully come to foreground
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      log('detect_current_screen: Taking screenshot');
      await takeScreenshot(screenshotPath);
      
      log('detect_current_screen: Validating screen');
      const screenType = await validateScreen(screenshotPath);
      
      log(`detect_current_screen: Detected '${screenType}'`);
      
      return { 
        content: [
          { type: 'text', text: `Current screen: ${screenType}` }
        ] 
      };
    } catch (error) {
      log(`detect_current_screen: Error - ${error}`);
      return { content: [{ type: 'text', text: `ERROR: ${error}` }] };
    }
  }

  // Low-level validated click
  if (toolName === 'minecraft_validated_click') {
    const { x, y, expected_screen_before, expected_screen_after } = request.params.arguments as any;
    const result = await doValidatedClick(x, y, expected_screen_before, expected_screen_after);
    return {
      content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }],
    };
  }

  // Click Play
  if (toolName === 'click_play') {
    const result = await doValidatedClick(
      COORDS.PLAY_BUTTON.x,
      COORDS.PLAY_BUTTON.y,
      'main_menu',
      'worlds_list'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Click Settings
  if (toolName === 'click_settings') {
    const result = await doValidatedClick(
      COORDS.SETTINGS_BUTTON.x,
      COORDS.SETTINGS_BUTTON.y,
      'main_menu',
      'settings'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Edit World
  if (toolName === 'edit_world') {
    const result = await doValidatedClick(
      COORDS.WORLD_EDIT_BUTTON.x,
      COORDS.WORLD_EDIT_BUTTON.y,
      'worlds_list',
      'world_edit'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Launch World
  if (toolName === 'launch_world') {
    const result = await doValidatedClick(
      COORDS.WORLD_TILE_LOAD.x,
      COORDS.WORLD_TILE_LOAD.y,
      'worlds_list',
      'in_game'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Scroll Down
  if (toolName === 'scroll_down') {
    const { amount = 3 } = request.params.arguments as any;
    try {
      if (!(await isMinecraftRunning())) await startMinecraft();
      await activateMinecraft();
      
      // Send scroll wheel events
      for (let i = 0; i < amount; i++) {
        await runPowerShell('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{DOWN}")');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return { content: [{ type: 'text', text: `SUCCESS: Scrolled down ${amount} times` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `ERROR: ${error}` }] };
    }
  }

  // Select Resource Packs
  if (toolName === 'select_resource_packs') {
    // Use hardcoded coordinates with DPI scaling conversion
    // Physical coordinates at 2560x1440: (320, 787)
    const scaleFactor = await getScaleFactor();
    const logicalX = Math.round(320 / scaleFactor);
    const logicalY = Math.round(787 / scaleFactor);
    
    log(`select_resource_packs: Using physical (320, 787) → logical (${logicalX}, ${logicalY}), scale=${scaleFactor}`);
    
    const result = await doValidatedClick(
      logicalX,
      logicalY,
      'world_edit',
      'resource_packs'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Select Behavior Packs
  if (toolName === 'select_behavior_packs') {
    // Use hardcoded coordinates with DPI scaling conversion
    // Physical coordinates at 2560x1440: (200, 1266)
    const scaleFactor = await getScaleFactor();
    const logicalX = Math.round(200 / scaleFactor);
    const logicalY = Math.round(1266 / scaleFactor);
    
    log(`select_behavior_packs: Using physical (200, 1266) → logical (${logicalX}, ${logicalY}), scale=${scaleFactor}`);
    
    const result = await doValidatedClick(
      logicalX,
      logicalY,
      'world_edit',
      'behavior_packs'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Activate Resource Pack
  if (toolName === 'activate_resource_pack') {
    const { confirm_update = true } = request.params.arguments as any;
    
    // Convert physical coordinates to logical with DPI scaling
    const scaleFactor = await getScaleFactor();
    const activateX = Math.round(COORDS.ACTIVATE_PACK.x / scaleFactor);
    const activateY = Math.round(COORDS.ACTIVATE_PACK.y / scaleFactor);
    const confirmX = Math.round(COORDS.CONFIRM_UPDATE.x / scaleFactor);
    const confirmY = Math.round(COORDS.CONFIRM_UPDATE.y / scaleFactor);
    
    // Click activate button
    let result = await doValidatedClick(
      activateX,
      activateY,
      'resource_packs',
      'confirm_dialog'
    );
    
    if (!result.success) {
      return { content: [{ type: 'text', text: `ERROR: ${result.message}` }] };
    }

    // Confirm update dialog if requested
    if (confirm_update) {
      result = await doValidatedClick(
        confirmX,
        confirmY,
        'confirm_dialog',
        'resource_packs'
      );
    }
    
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Activate Behavior Pack
  if (toolName === 'activate_behavior_pack') {
    // Convert physical coordinates to logical with DPI scaling
    const scaleFactor = await getScaleFactor();
    const logicalX = Math.round(COORDS.ACTIVATE_PACK.x / scaleFactor);
    const logicalY = Math.round(COORDS.ACTIVATE_PACK.y / scaleFactor);
    
    const result = await doValidatedClick(
      logicalX,
      logicalY,
      'behavior_packs',
      'behavior_packs'
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Deactivate packs - TODO: requires finding pack in active list
  if (toolName === 'deactivate_resource_pack' || toolName === 'deactivate_behavior_pack') {
    return {
      content: [{ type: 'text', text: 'ERROR: Deactivation requires finding pack in active list - not yet implemented' }],
    };
  }

  // Go Back
  if (toolName === 'go_back') {
    // Convert physical back button coordinates to logical
    const scaleFactor = await getScaleFactor();
    const logicalX = Math.round(COORDS.BACK_BUTTON.x / scaleFactor);
    const logicalY = Math.round(COORDS.BACK_BUTTON.y / scaleFactor);
    
    // Take screenshot to detect current screen
    await activateMinecraft();
    const screenshotPath = 'C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\current_screen.png';
    await takeScreenshot(screenshotPath);
    const currentScreen = await validateScreen(screenshotPath);
    
    let expectedAfterScreen = 'worlds_list';
    
    if (currentScreen === 'behavior_packs' || currentScreen === 'resource_packs') {
      expectedAfterScreen = 'world_edit';
    } else if (currentScreen === 'world_edit') {
      expectedAfterScreen = 'worlds_list';
    }
    
    const result = await doValidatedClick(
      logicalX,
      logicalY,
      currentScreen,
      expectedAfterScreen
    );
    return { content: [{ type: 'text', text: result.success ? `SUCCESS: ${result.message}` : `ERROR: ${result.message}` }] };
  }

  // Open Content Log - TODO: requires ESC menu navigation
  if (toolName === 'open_content_log') {
    return {
      content: [{ type: 'text', text: 'ERROR: Content log requires ESC menu navigation - not yet implemented' }],
    };
  }

  throw new Error(`Unknown tool: ${toolName}`);
  } finally {
    // Always switch back to VS Code after any Minecraft action
    await switchToVSCode();
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Minecraft Automation MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
