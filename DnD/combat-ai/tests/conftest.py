"""
Pytest conftest — adds combat-ai to sys.path for all test modules.
"""

import sys
from pathlib import Path

# Ensure the combat-ai package root is importable
sys.path.insert(0, str(Path(__file__).parent.parent))
# Ensure the tests directory is also importable (for factories)
sys.path.insert(0, str(Path(__file__).parent))
