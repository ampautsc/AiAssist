import json

# Load the OCR analysis
with open('minecraft-navigation-data/ocr_analysis.json', 'r') as f:
    data = json.load(f)

for i, click in enumerate(data['clicks'], 1):
    print(f"\n{'='*60}")
    print(f"CLICK {i}: ({click['x']}, {click['y']})")
    print(f"{'='*60}")
    print("BEFORE:")
    before_lines = [line.strip() for line in click['before_text'].split('\n') if line.strip()]
    for line in before_lines[:8]:
        print(f"  {line}")
    print("\nAFTER:")
    after_lines = [line.strip() for line in click['after_text'].split('\n') if line.strip()]
    for line in after_lines[:8]:
        print(f"  {line}")
    print(f"\nACTION: ", end="")
    input("What did this click accomplish? ")
