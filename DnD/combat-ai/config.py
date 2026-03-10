"""
Combat AI configuration.

All configurable values for the combat AI module. Ollama connection,
model selection, timeouts, and feature flags.
"""

from dataclasses import dataclass, field
from pathlib import Path


MODULE_ROOT = Path(__file__).parent


@dataclass(frozen=True)
class OllamaConfig:
    """Connection settings for local Ollama LLM."""
    host: str = "http://localhost:11434"
    model: str = "mistral"
    timeout_seconds: float = 10.0
    max_retries: int = 1
    temperature: float = 0.7


@dataclass(frozen=True)
class AIConfig:
    """Combat AI behavior settings."""
    # Intelligence score threshold: >= this uses LLM, below uses rules
    llm_intelligence_threshold: int = 12

    # When True, LLM failures fall back to the rule engine silently
    llm_fallback_to_rules: bool = True

    # Maximum number of recent combat events included in LLM context
    max_recent_events: int = 6

    # Random noise factor for rule-based decisions (0.0 = deterministic, 1.0 = very random)
    rule_noise_factor: float = 0.15


@dataclass(frozen=True)
class PerceptionConfig:
    """Fog of war and perception settings."""
    # Default vision range in hexes (no darkvision, normal light)
    default_vision_range: int = 12

    # Sound awareness range in hexes (can hear combat)
    sound_awareness_range: int = 8

    # How many rounds a creature remembers last-known positions (by tier)
    memory_rounds_by_tier: dict[str, int] = field(default_factory=lambda: {
        "mindless": 0,
        "bestial": 1,
        "low": 2,
        "cunning": 3,
        "tactical": 5,
        "genius": 99,  # effectively unlimited within one combat
    })


@dataclass(frozen=True)
class CombatAISettings:
    """Top-level settings container."""
    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    ai: AIConfig = field(default_factory=AIConfig)
    perception: PerceptionConfig = field(default_factory=PerceptionConfig)
    profiles_dir: Path = field(default_factory=lambda: MODULE_ROOT / "ai" / "profiles")
    creatures_dir: Path = field(default_factory=lambda: MODULE_ROOT / "data" / "creatures")
    spells_dir: Path = field(default_factory=lambda: MODULE_ROOT / "data" / "spells")
    scenarios_dir: Path = field(default_factory=lambda: MODULE_ROOT / "data" / "scenarios")


# Default settings instance
DEFAULT_SETTINGS = CombatAISettings()
