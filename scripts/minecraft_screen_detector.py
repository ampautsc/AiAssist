"""
Minecraft Screen Detector
Identifies which Minecraft screen is currently displayed based on OCR text patterns
"""
import pytesseract
from PIL import Image
import re
from enum import Enum
from typing import Dict, List, Tuple, Optional
import json

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class MinecraftScreen(Enum):
    MAIN_MENU = "main_menu"
    WORLDS_LIST = "worlds_list"
    WORLD_EDIT = "world_edit"
    RESOURCE_PACKS = "resource_packs"
    BEHAVIOR_PACKS = "behavior_packs"
    STORAGE_SETTINGS = "storage_settings"
    IN_GAME = "in_game"
    PAUSE_MENU = "pause_menu"
    CONFIRMATION_DIALOG = "confirmation_dialog"
    SETTINGS = "settings"
    UNKNOWN = "unknown"

class ScreenDetector:
    def __init__(self):
        # Define text patterns that identify each screen
        self.screen_patterns = {
            MinecraftScreen.MAIN_MENU: [
                r"play",
                r"settings",
                r"marketplace",
                r"achievements"
            ],
            MinecraftScreen.WORLDS_LIST: [
                r"worlds",
                r"realms",
                r"creative",
                r"survival",
                r"\d{1,2}/\d{1,2}/\d{2,4}"  # Date pattern
            ],
            MinecraftScreen.WORLD_EDIT: [
                r"edit\s+world",
                r"world\s+name",
                r"game\s+mode",
                r"resource\s+packs",
                r"behavior\s+packs",
                r"achievements\s+disabled"
            ],
            MinecraftScreen.RESOURCE_PACKS: [
                r"resource\s+packs",
                r"active",
                r"available",
                r"global\s+packs",
                r"minecraft\s+texture\s+pack"
            ],
            MinecraftScreen.BEHAVIOR_PACKS: [
                r"behavior\s+packs",
                r"add-ons",
                r"active",
                r"available"
            ],
            MinecraftScreen.STORAGE_SETTINGS: [
                r"storage",
                r"delete",
                r"mb\s+-\s+\d+\s+item",
                r"behavior\s+packs.*mb",
                r"resource\s+packs.*mb"
            ],
            MinecraftScreen.IN_GAME: [
                r"content\s+log",
                r"history",
                r"fps",
                r"coordinates",
                r"\[.*\]\[.*\]"  # Log pattern
            ],
            MinecraftScreen.PAUSE_MENU: [
                r"resume\s+game",
                r"save\s+&\s+quit",
                r"settings",
                r"feedback"
            ],
            MinecraftScreen.CONFIRMATION_DIALOG: [
                r"hold\s+on",
                r"are\s+you\s+sure",
                r"continue",
                r"cancel",
                r"permanent.*data\s+loss"
            ],
            MinecraftScreen.SETTINGS: [
                r"settings",
                r"subscriptions",
                r"global\s+resources",
                r"clear",
                r"text\s+to\s+speech"
            ]
        }
        
    def extract_text(self, image_path: str) -> str:
        """Extract text from screenshot using OCR"""
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        img.close()
        return text.lower()
    
    def detect_screen(self, image_path: str) -> Tuple[MinecraftScreen, float, List[str]]:
        """
        Detect which screen is displayed
        Returns: (screen_type, confidence, matched_patterns)
        """
        text = self.extract_text(image_path)
        
        screen_scores = {}
        screen_matches = {}
        
        for screen_type, patterns in self.screen_patterns.items():
            matches = []
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    matches.append(pattern)
            
            score = len(matches) / len(patterns)
            screen_scores[screen_type] = score
            screen_matches[screen_type] = matches
        
        # Find best match
        best_screen = max(screen_scores.items(), key=lambda x: x[1])
        
        if best_screen[1] == 0:
            return MinecraftScreen.UNKNOWN, 0.0, []
        
        return best_screen[0], best_screen[1], screen_matches[best_screen[0]]
    
    def get_available_actions(self, screen: MinecraftScreen) -> List[str]:
        """Get list of actions available from this screen"""
        actions = {
            MinecraftScreen.MAIN_MENU: ["click_play", "click_settings", "exit"],
            MinecraftScreen.WORLDS_LIST: ["select_world", "create_world", "back"],
            MinecraftScreen.WORLD_EDIT: ["play_world", "edit_resource_packs", "edit_behavior_packs", "back"],
            MinecraftScreen.RESOURCE_PACKS: ["activate_pack", "deactivate_pack", "back"],
            MinecraftScreen.BEHAVIOR_PACKS: ["activate_pack", "deactivate_pack", "back"],
            MinecraftScreen.STORAGE_SETTINGS: ["delete_pack", "back"],
            MinecraftScreen.IN_GAME: ["open_pause_menu", "run_command"],
            MinecraftScreen.PAUSE_MENU: ["resume", "save_and_quit", "open_settings"],
            MinecraftScreen.CONFIRMATION_DIALOG: ["confirm", "cancel"],
            MinecraftScreen.SETTINGS: ["open_storage", "back"],
        }
        return actions.get(screen, [])

def test_detector(data_path: str = r'C:\Users\ampau\source\AiAssist\AiAssist\minecraft-navigation-data'):
    """Test screen detector on captured screenshots"""
    import os
    
    detector = ScreenDetector()
    results = []
    
    print("=" * 80)
    print("SCREEN DETECTION TEST")
    print("=" * 80)
    
    for i in range(1, 14):
        before_path = os.path.join(data_path, f'click_{i}_before.png')
        after_path = os.path.join(data_path, f'click_{i}_after.png')
        
        print(f"\nCLICK {i}:")
        print("-" * 40)
        
        for label, path in [("BEFORE", before_path), ("AFTER", after_path)]:
            if os.path.exists(path):
                screen, confidence, matches = detector.detect_screen(path)
                print(f"  {label}: {screen.value} (confidence: {confidence:.2f})")
                if matches:
                    print(f"    Matched: {', '.join(matches[:3])}")
                
                actions = detector.get_available_actions(screen)
                if actions:
                    print(f"    Actions: {', '.join(actions)}")
                
                results.append({
                    'click': i,
                    'state': label.lower(),
                    'screen': screen.value,
                    'confidence': confidence,
                    'matches': matches,
                    'actions': actions
                })
    
    # Save results
    output_path = os.path.join(data_path, 'screen_detection_results.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "=" * 80)
    print(f"Results saved to {output_path}")
    print("=" * 80)
    
    return results

if __name__ == "__main__":
    test_detector()
