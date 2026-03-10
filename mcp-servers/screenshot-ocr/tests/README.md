# MCP Server Testing Framework

## Testing Best Practices

### 1. Test Fixtures
- Use known screenshots with verified coordinates
- Document what each screenshot should contain
- Never assume - always verify against expected results

### 2. Verification Strategy
- Define expected elements BEFORE testing
- After action (like click), verify specific expected elements appear
- Compare against baseline/expected state
- Fail fast with clear error messages

### 3. Test Structure
```
Given: Starting state (screenshot with known elements)
When: Action performed (detect button, click coordinate)
Then: Expected result (specific elements found with coordinates)
```

### 4. Coordinate Verification
- Use multiple verification points
- Check for expected text at expected locations
- Verify unwanted elements are NOT present
- Calculate position relationships (button below another, etc.)

### 5. Regression Testing
- Keep test fixtures in version control
- Re-run all tests after code changes
- Document failures with actual vs expected

## Test Files Structure
```
tests/
  fixtures/
    minecraft_main_menu.png - Known main menu screenshot
    minecraft_worlds_list.png - Screenshot after clicking Play
    expected_results.json - Expected coordinates and elements
  test_ocr_detection.py - OCR accuracy tests
  test_ui_detection.py - UI element detection tests
  test_menu_navigation.py - Navigation workflow tests
```
