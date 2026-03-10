# Unload addon workflow using WORKING click method
# Assumes we're at worlds list after clicking Play

Write-Host "="*80
Write-Host "UNLOAD ADDON WORKFLOW"
Write-Host "="*80

$clickScript = "C:\Users\ampau\source\AiAssist\AiAssist\mcp-servers\minecraft-automation\scripts\click_working.ps1"

function Click-AndWait {
    param([int]$X, [int]$Y, [int]$WaitSeconds = 2)
    Start-Process powershell -ArgumentList "-NoExit", "-File", $clickScript, "-X", $X, "-Y", $Y -Wait
    Start-Sleep -Seconds $WaitSeconds
}

# Step 1: Select world to edit (My World or Addon Test)
Write-Host "`nStep 1: Selecting world edit..."
Click-AndWait -X 372 -Y 527 -WaitSeconds 2

# Step 2: Expand menu
Write-Host "Step 2: Expanding menu..."
Click-AndWait -X 550 -Y 525 -WaitSeconds 2

# Step 3: Open Resource Packs (need to find this coordinate)
Write-Host "Step 3: Opening Resource Packs..."
Write-Host "COORDINATE UNKNOWN - need to capture this"
# Click-AndWait -X ??? -Y ??? -WaitSeconds 2

Write-Host "`nPausing - please manually navigate to resource packs and tell me when ready to continue"
Read-Host "Press Enter when at Resource Packs screen"

# Step 4: Remove resource pack (X button on active pack)
Write-Host "Step 4: Removing resource pack..."
Click-AndWait -X 1652 -Y 217 -WaitSeconds 2

# Step 5: Confirm removal
Write-Host "Step 5: Confirming removal..."
Click-AndWait -X 943 -Y 602 -WaitSeconds 2

# Step 6: Back to edit screen
Write-Host "Step 6: Going back..."
Click-AndWait -X 19 -Y 16 -WaitSeconds 2

# Repeat for Behavior Pack
Write-Host "`nStep 7: Opening Behavior Packs..."
Write-Host "COORDINATE UNKNOWN - need to capture this"

Write-Host "`nPausing - please manually navigate to behavior packs"
Read-Host "Press Enter when at Behavior Packs screen"

Write-Host "Step 8: Removing behavior pack..."
Click-AndWait -X 1652 -Y 217 -WaitSeconds 2

Write-Host "Step 9: Confirming removal..."
Click-AndWait -X 943 -Y 602 -WaitSeconds 2

Write-Host "Step 10: Back to worlds..."
Click-AndWait -X 19 -Y 16 -WaitSeconds 2

# Navigate to Settings -> Storage
Write-Host "`nStep 11: Going to settings..."
Click-AndWait -X 198 -Y 543 -WaitSeconds 2

Write-Host "Step 12: Expanding storage..."
Click-AndWait -X 1145 -Y 857 -WaitSeconds 2

Write-Host "Step 13: Clicking delete on pack..."
Click-AndWait -X 1146 -Y 847 -WaitSeconds 2

Write-Host "Step 14: Confirming delete..."
Click-AndWait -X 896 -Y 825 -WaitSeconds 2

Write-Host "`n" + "="*80
Write-Host "UNLOAD COMPLETE"
Write-Host "="*80
