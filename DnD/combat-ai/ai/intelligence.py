"""
Intelligence tiers and AI profile loading.

Maps creature intelligence scores to behavioral tiers, and loads
YAML AI profiles that customize per-creature-type decision making.
"""

from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import Any, Optional

import yaml
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Intelligence tiers
# ---------------------------------------------------------------------------

class IntelligenceTier(str, Enum):
    """
    Behavioral intelligence tier. Determines which engine handles decisions
    and how sophisticated the creature's tactics are.

    INT Score Ranges (defaults, overridable per profile):
        MINDLESS:  1-2   (zombies, skeletons, oozes)
        BESTIAL:   3-4   (wolves, bears, giant spiders)
        LOW:       5-7   (goblins, kobolds, ogres)
        CUNNING:   8-11  (orcs, bandits, hobgoblins)
        TACTICAL:  12-15 (knights, cult fanatics, veterans)
        GENIUS:    16+   (liches, archmages, ancient dragons)
    """
    MINDLESS = "mindless"
    BESTIAL = "bestial"
    LOW = "low"
    CUNNING = "cunning"
    TACTICAL = "tactical"
    GENIUS = "genius"


def tier_from_intelligence(int_score: int) -> IntelligenceTier:
    """Derive the default intelligence tier from an INT ability score."""
    if int_score <= 2:
        return IntelligenceTier.MINDLESS
    elif int_score <= 4:
        return IntelligenceTier.BESTIAL
    elif int_score <= 7:
        return IntelligenceTier.LOW
    elif int_score <= 11:
        return IntelligenceTier.CUNNING
    elif int_score <= 15:
        return IntelligenceTier.TACTICAL
    else:
        return IntelligenceTier.GENIUS


def tier_uses_llm(tier: IntelligenceTier) -> bool:
    """Return True if this tier should use the LLM engine."""
    return tier in (IntelligenceTier.TACTICAL, IntelligenceTier.GENIUS)


# ---------------------------------------------------------------------------
# AI profile (loaded from YAML)
# ---------------------------------------------------------------------------

class AIProfile(BaseModel):
    """
    Per-creature-type AI configuration, loaded from YAML.
    Customizes behavior beyond what the intelligence tier provides.
    """
    creature_type: str
    intelligence_tier_override: Optional[IntelligenceTier] = None
    personality: str = ""
    preferred_tactics: list[str] = Field(default_factory=list)
    special_behaviors: dict[str, Any] = Field(default_factory=dict)
    flee_hp_percent: float = 0.0        # 0 = never flees
    preferred_targets: list[str] = Field(default_factory=list)  # e.g. ["casters", "wounded"]
    avoids: list[str] = Field(default_factory=list)  # e.g. ["melee_if_possible"]


def load_profile(creature_type: str, profiles_dir: Path) -> Optional[AIProfile]:
    """
    Load an AI profile from a YAML file.
    Returns None if no profile exists for this creature type.
    """
    profile_path = profiles_dir / f"{creature_type}.yaml"
    if not profile_path.exists():
        return None

    with open(profile_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if data is None:
        return None

    return AIProfile(**data)


def resolve_tier(
    int_score: int,
    profile: Optional[AIProfile] = None,
) -> IntelligenceTier:
    """
    Determine the effective intelligence tier for a creature.
    Profile override takes precedence over the INT-score-based default.
    """
    if profile and profile.intelligence_tier_override:
        return profile.intelligence_tier_override
    return tier_from_intelligence(int_score)
