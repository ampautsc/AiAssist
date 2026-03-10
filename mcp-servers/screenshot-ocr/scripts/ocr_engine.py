"""
OCR Engine for screenshot text detection
Uses pytesseract with fallback to pattern-based detection
"""
import sys
import json
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

def find_tesseract():
    """Find Tesseract executable"""
    import os
    paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Tesseract-OCR\tesseract.exe",
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def preprocess_image(img):
    """Enhance image for better OCR - especially for stylized game fonts"""
    # Convert to grayscale if not already
    if img.mode != 'L':
        img = img.convert('L')
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    
    # Increase sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(2.0)
    
    # Apply threshold to get pure black/white
    # This helps with stylized fonts
    img_array = np.array(img)
    threshold = 127
    img_array = ((img_array > threshold) * 255).astype(np.uint8)
    img = Image.fromarray(img_array)
    
    return img

def ocr_with_pytesseract(image_path, search_text=None):
    """Perform OCR using pytesseract with enhanced preprocessing"""
    try:
        import pytesseract
        
        # Try to find Tesseract
        tesseract_path = find_tesseract()
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        img = Image.open(image_path)
        
        # Try multiple preprocessing approaches
        results_all = []
        
        # Approach 1: Original image with optimized config
        custom_config = r'--oem 3 --psm 11'  # PSM 11: Sparse text, OEM 3: Default
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config=custom_config)
        results_all.extend(extract_results(data, search_text))
        
        # Approach 2: Preprocessed image for better contrast
        img_enhanced = preprocess_image(img)
        custom_config = r'--oem 3 --psm 11 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '
        data = pytesseract.image_to_data(img_enhanced, output_type=pytesseract.Output.DICT, config=custom_config)
        results_all.extend(extract_results(data, search_text, confidence_threshold=40))
        
        # Approach 3: Try different PSM mode for button text
        custom_config = r'--oem 3 --psm 6'  # PSM 6: Assume uniform block of text
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config=custom_config)
        results_all.extend(extract_results(data, search_text, confidence_threshold=50))
        
        # Deduplicate results (same text at similar coordinates)
        results = deduplicate_results(results_all)
        
        return results
        
    except Exception as e:
        return {'error': f'pytesseract failed: {str(e)}'}

def extract_results(data, search_text=None, confidence_threshold=30):
    """Extract results from pytesseract data dict"""
    results = []
    n_boxes = len(data['text'])
    
    for i in range(n_boxes):
        text = data['text'][i].strip()
        if not text:
            continue
            
        conf = int(data['conf'][i])
        if conf < confidence_threshold:
            continue
        
        x = data['left'][i]
        y = data['top'][i]
        w = data['width'][i]
        h = data['height'][i]
        
        center_x = x + w // 2
        center_y = y + h // 2
        
        if search_text:
            if search_text.lower() in text.lower():
                results.append({
                    'text': text,
                    'x': center_x,
                    'y': center_y,
                    'width': w,
                    'height': h,
                    'confidence': conf
                })
        else:
            results.append({
                'text': text,
                'x': center_x,
                'y': center_y,
                'width': w,
                'height': h,
                'confidence': conf
            })
    
    return results

def deduplicate_results(results):
    """Remove duplicate detections (same text at similar location)"""
    if not results:
        return []
    
    # Sort by confidence descending
    results.sort(key=lambda r: r['confidence'], reverse=True)
    
    unique = []
    for result in results:
        is_duplicate = False
        for existing in unique:
            # Check if same text and nearby location
            if (result['text'].lower() == existing['text'].lower() and
                abs(result['x'] - existing['x']) < 50 and
                abs(result['y'] - existing['y']) < 50):
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique.append(result)
    
    return unique

def ocr_with_easyocr(image_path, search_text=None):
    """Perform OCR using easyocr (doesn't need external executable)"""
    try:
        import easyocr
        
        reader = easyocr.Reader(['en'], gpu=False)
        result = reader.readtext(image_path)
        
        results = []
        for detection in result:
            bbox, text, conf = detection
            text = text.strip()
            
            if not text:
                continue
                
            # Calculate center point from bbox
            x_coords = [point[0] for point in bbox]
            y_coords = [point[1] for point in bbox]
            center_x = int(sum(x_coords) / len(x_coords))
            center_y = int(sum(y_coords) / len(y_coords))
            width = int(max(x_coords) - min(x_coords))
            height = int(max(y_coords) - min(y_coords))
            
            if search_text:
                if search_text.lower() in text.lower():
                    results.append({
                        'text': text,
                        'x': center_x,
                        'y': center_y,
                        'width': width,
                        'height': height,
                        'confidence': int(conf * 100)
                    })
            else:
                results.append({
                    'text': text,
                    'x': center_x,
                    'y': center_y,
                    'width': width,
                    'height': height,
                    'confidence': int(conf * 100)
                })
        
        return results
        
    except Exception as e:
        return {'error': f'easyocr failed: {str(e)}'}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: ocr_engine.py <image_path> [search_text]'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    search_text = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Try pytesseract first
    result = ocr_with_pytesseract(image_path, search_text)
    
    # If pytesseract failed, try easyocr
    if isinstance(result, dict) and 'error' in result:
        result = ocr_with_easyocr(image_path, search_text)
    
    # If both failed, return error
    if isinstance(result, dict) and 'error' in result:
        print(json.dumps(result))
        sys.exit(1)
    
    # Success - return results
    output = {
        'found': len(result),
        'texts': result
    }
    print(json.dumps(output, indent=2))

if __name__ == '__main__':
    main()
