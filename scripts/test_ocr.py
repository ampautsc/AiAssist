import sys
try:
    import pytesseract
    from PIL import Image
    print("✓ pytesseract imported")
    print("✓ PIL imported")
    
    # Check for Tesseract executable
    try:
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract executable found: {version}")
    except Exception as e:
        print(f"✗ Tesseract executable not found: {e}")
        print("\nSearching for Tesseract in common locations...")
        import os
        common_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Tesseract-OCR\tesseract.exe",
        ]
        for path in common_paths:
            if os.path.exists(path):
                print(f"Found: {path}")
                pytesseract.pytesseract.tesseract_cmd = path
                break
        
except ImportError as e:
    print(f"✗ Import failed: {e}")
    sys.exit(1)
