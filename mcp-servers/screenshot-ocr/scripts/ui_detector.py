"""
UI Element Detection for Game Menus
Finds buttons, interactive regions, and UI elements from screenshots
Goes beyond OCR to detect visual UI components
"""
import sys
import json
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np
from pathlib import Path
import hashlib

def hash_image_region(img, region):
    """Create hash of image region for caching"""
    x, y, w, h = region
    cropped = img.crop((x, y, x+w, y+h))
    return hashlib.md5(cropped.tobytes()).hexdigest()

def detect_rectangles(img, min_size=50, max_size=600):
    """
    Detect rectangular UI elements (buttons, panels) using edge detection
    Returns list of (x, y, width, height) tuples
    """
    # Convert to grayscale
    gray = img.convert('L')
    
    # Enhance edges
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edges = ImageEnhance.Contrast(edges).enhance(3.0)
    
    # Convert to numpy for analysis
    edge_array = np.array(edges)
    
    # Find horizontal and vertical line segments
    height, width = edge_array.shape
    rectangles = []
    
    # Simplified rectangle detection - scan for consistent edge patterns
    # This is a basic implementation - could be enhanced with OpenCV
    threshold = 100
    
    # Scan for button-like regions (areas with defined borders)
    step = 20  # Sample every 20 pixels for performance
    for y in range(0, height - min_size, step):
        for x in range(0, width - min_size, step):
            # Check multiple sizes
            for size_h in range(min_size, min(max_size, height - y), 50):
                for size_w in range(min_size * 2, min(max_size * 2, width - x), 50):
                    # Sample edges of this potential rectangle
                    top_edge = edge_array[y, x:x+size_w].mean()
                    bottom_edge = edge_array[y+size_h-1, x:x+size_w].mean()
                    left_edge = edge_array[y:y+size_h, x].mean()
                    right_edge = edge_array[y:y+size_h, x+size_w-1].mean()
                    
                    # If all edges are strong, this is likely a button
                    if (top_edge > threshold and bottom_edge > threshold and
                        left_edge > threshold and right_edge > threshold):
                        rectangles.append((x, y, size_w, size_h))
    
    # Deduplicate overlapping rectangles
    rectangles = deduplicate_rectangles(rectangles)
    
    return rectangles

def deduplicate_rectangles(rectangles):
    """Remove overlapping rectangles, keeping the most confident ones"""
    if not rectangles:
        return []
    
    # Sort by area (larger rectangles first)
    rectangles = sorted(rectangles, key=lambda r: r[2] * r[3], reverse=True)
    
    unique = []
    for rect in rectangles:
        x1, y1, w1, h1 = rect
        is_duplicate = False
        
        for existing in unique:
            x2, y2, w2, h2 = existing
            
            # Check if centers are very close
            center1_x = x1 + w1 // 2
            center1_y = y1 + h1 // 2
            center2_x = x2 + w2 // 2
            center2_y = y2 + h2 // 2
            
            if (abs(center1_x - center2_x) < min(w1, w2) // 2 and
                abs(center1_y - center2_y) < min(h1, h2) // 2):
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique.append(rect)
    
    return unique

def analyze_color_profile(img, region):
    """
    Analyze color characteristics of a region to classify UI element type
    """
    x, y, w, h = region
    cropped = img.crop((x, y, x+w, y+h))
    
    # Convert to RGB if needed
    if cropped.mode != 'RGB':
        cropped = cropped.convert('RGB')
    
    # Get color statistics
    colors = np.array(cropped)
    avg_color = colors.mean(axis=(0, 1))
    std_color = colors.std(axis=(0, 1))
    
    # Analyze brightness
    gray = cropped.convert('L')
    brightness = np.array(gray).mean()
    
    # Classify based on characteristics
    element_type = 'unknown'
    confidence = 50
    
    if brightness > 180:
        element_type = 'button_highlighted'
        confidence = 70
    elif brightness > 100:
        element_type = 'button_normal'
        confidence = 65
    elif std_color.mean() < 20:
        element_type = 'panel_background'
        confidence = 60
    else:
        element_type = 'textured_element'
        confidence = 50
    
    return element_type, confidence, {
        'avg_brightness': float(brightness),
        'avg_color': avg_color.tolist(),
        'color_variance': std_color.tolist()
    }

def find_ocr_text(img):
    """
    Use existing OCR to find text labels
    """
    try:
        import pytesseract
        
        # Try to find Tesseract
        import os
        paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for p in paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                break
        
        # Get text with bounding boxes
        custom_config = r'--oem 3 --psm 11'
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config=custom_config)
        
        texts = []
        for i in range(len(data['text'])):
            text = data['text'][i].strip()
            if not text or int(data['conf'][i]) < 40:
                continue
            
            texts.append({
                'text': text,
                'x': data['left'][i],
                'y': data['top'][i],
                'width': data['width'][i],
                'height': data['height'][i],
                'confidence': int(data['conf'][i])
            })
        
        return texts
    except:
        return []

def match_text_to_rectangles(rectangles, texts, img):
    """
    Match OCR text to detected UI rectangles to label buttons
    """
    ui_elements = []
    
    for rect in rectangles:
        rx, ry, rw, rh = rect
        center_x = rx + rw // 2
        center_y = ry + rh // 2
        
        # Find text within or near this rectangle
        matching_text = []
        for text_info in texts:
            tx = text_info['x']
            ty = text_info['y']
            tw = text_info['width']
            th = text_info['height']
            
            # Check if text is inside rectangle
            if (rx <= tx <= rx + rw and ry <= ty <= ry + rh):
                matching_text.append(text_info['text'])
        
        # Analyze the rectangle
        element_type, confidence, color_info = analyze_color_profile(img, rect)
        
        # Combine information
        label = ' '.join(matching_text) if matching_text else None
        
        # If we have text, it's definitely a button
        if label:
            element_type = 'button_labeled'
            confidence = 80
        
        ui_elements.append({
            'type': element_type,
            'label': label,
            'x': center_x,
            'y': center_y,
            'width': rw,
            'height': rh,
            'confidence': confidence,
            'color_profile': color_info,
            'region_hash': hash_image_region(img, rect)
        })
    
    return ui_elements

def detect_ui_elements(image_path):
    """
    Main function: detect all clickable UI elements in screenshot
    """
    img = Image.open(image_path)
    
    # Step 1: Find rectangles (buttons, panels)
    rectangles = detect_rectangles(img)
    
    # Step 2: Find text via OCR
    texts = find_ocr_text(img)
    
    # Step 3: Match text to rectangles
    ui_elements = match_text_to_rectangles(rectangles, texts, img)
    
    # Step 4: Add standalone text elements (not in rectangles)
    for text_info in texts:
        tx = text_info['x'] + text_info['width'] // 2
        ty = text_info['y'] + text_info['height'] // 2
        
        # Check if already part of a button
        already_included = False
        for elem in ui_elements:
            if (elem['label'] and text_info['text'] in elem['label']):
                already_included = True
                break
        
        if not already_included:
            ui_elements.append({
                'type': 'text_label',
                'label': text_info['text'],
                'x': tx,
                'y': ty,
                'width': text_info['width'],
                'height': text_info['height'],
                'confidence': text_info['confidence'],
                'color_profile': None,
                'region_hash': None
            })
    
    return ui_elements

def save_debug_image(image_path, ui_elements):
    """
    Create annotated image showing detected UI elements
    """
    img = Image.open(image_path)
    draw = ImageDraw.Draw(img)
    
    for elem in ui_elements:
        x, y = elem['x'], elem['y']
        w, h = elem['width'], elem['height']
        
        # Draw bounding box
        color = 'green' if elem['confidence'] > 70 else 'yellow'
        draw.rectangle([x - w//2, y - h//2, x + w//2, y + h//2], outline=color, width=2)
        
        # Draw label
        if elem['label']:
            draw.text((x, y), elem['label'], fill='red')
    
    output_path = Path(image_path).parent / f"{Path(image_path).stem}_annotated.png"
    img.save(output_path)
    return str(output_path)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: ui_detector.py <image_path> [--debug]'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    debug_mode = '--debug' in sys.argv
    
    try:
        # Detect UI elements
        ui_elements = detect_ui_elements(image_path)
        
        # Save debug image if requested
        debug_image = None
        if debug_mode:
            debug_image = save_debug_image(image_path, ui_elements)
        
        # Output results
        result = {
            'image': image_path,
            'found': len(ui_elements),
            'elements': ui_elements,
            'debug_image': debug_image
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
