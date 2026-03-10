"""
CLEAN TEST SUITE: Level 8 Ranged Build Comparisons

Testing philosophy:
1. Always compare builds with IDENTICAL feat selections to isolate subclass differences
2. Separately test the VALUE of each feat/feature by toggling it
3. No misleading "optimal" comparisons that use different feat combinations
"""

import pytest
from utils.character_builds import (
    CharacterBuild, FeatSet, Weapon, MagicItems, ClassFeatures, AdvantageSource,
    create_lore_bard_build, create_swords_bard_build, create_bows_bard_build,
    create_beast_master_ranger_build, create_ranger_build
)


# ==============================================================================
# PART 1: BARD SUBCLASS COMPARISON (Same Feats, Different Subclasses)
# ==============================================================================

class TestBardSubclassValue:
    """Compare Bard subclasses with IDENTICAL feat selections."""
    
    def test_extra_attack_value_ce_ea_ss(self):
        """Extra Attack adds 50% more DPR (3 attacks vs 2)."""
        feats = FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True)
        adv = AdvantageSource.none()
        
        lore = create_lore_bard_build(feats, adv)
        swords = create_swords_bard_build(feats, adv)
        
        lore_dpr = lore.calculate_dpr(16)['total_dpr']
        swords_dpr = swords.calculate_dpr(16)['total_dpr']
        
        # Lore: 2 attacks, Swords: 3 attacks
        assert lore.get_attack_count() == 2
        assert swords.get_attack_count() == 3
        
        # Swords should be ~50% more DPR
        ratio = swords_dpr / lore_dpr
        assert abs(ratio - 1.5) < 0.1, f"Expected ~1.5x, got {ratio:.2f}x"
        
    def test_archery_fighting_style_value(self):
        """Built-in Archery adds +2 to hit, increasing DPR significantly."""
        feats = FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True)
        adv = AdvantageSource.none()
        
        swords = create_swords_bard_build(feats, adv)  # No Archery
        bows = create_bows_bard_build(feats, adv)      # Has Archery
        
        swords_dpr = swords.calculate_dpr(16)['total_dpr']
        bows_dpr = bows.calculate_dpr(16)['total_dpr']
        
        # Bows Bard should have higher DPR due to +2 to hit
        assert bows_dpr > swords_dpr, "Bows Bard should beat Swords Bard with same feats"
        
        # With SS: 35% hit (Swords) vs 45% hit (Bows) = ~28% more damage
        expected_ratio = 0.45 / 0.35  # 1.286
        actual_ratio = bows_dpr / swords_dpr
        assert abs(actual_ratio - expected_ratio) < 0.1, f"Expected ~{expected_ratio:.2f}x, got {actual_ratio:.2f}x"
        
    def test_all_bard_subclasses_same_feats(self):
        """Complete comparison: Lore < Swords < Bows with identical feats."""
        feats = FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True)
        adv = AdvantageSource.none()
        
        lore = create_lore_bard_build(feats, adv)
        swords = create_swords_bard_build(feats, adv)
        bows = create_bows_bard_build(feats, adv)
        
        lore_dpr = lore.calculate_dpr(16)['total_dpr']
        swords_dpr = swords.calculate_dpr(16)['total_dpr']
        bows_dpr = bows.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== BARD SUBCLASS COMPARISON (Same Feats: CE+EA+SS) ===")
        print(f"Lore Bard (2 attacks, no Archery): {lore_dpr:.2f} DPR")
        print(f"Swords Bard (3 attacks, no Archery): {swords_dpr:.2f} DPR")
        print(f"Bows Bard (3 attacks + Archery): {bows_dpr:.2f} DPR")
        
        assert lore_dpr < swords_dpr < bows_dpr
        
        # Verify specific values
        assert abs(lore_dpr - 12.60) < 0.5
        assert abs(swords_dpr - 18.90) < 0.5
        assert abs(bows_dpr - 24.15) < 0.5


# ==============================================================================
# PART 2: FEAT VALUE ANALYSIS (Same Subclass, Different Feats)
# ==============================================================================

class TestFeatValue:
    """Analyze the value of each feat by toggling it."""
    
    def test_sharpshooter_value_no_advantage(self):
        """Sharpshooter trades accuracy for damage. Worth it?"""
        adv = AdvantageSource.none()
        
        with_ss = create_bows_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True),
            adv
        )
        without_ss = create_bows_bard_build(
            FeatSet(crossbow_expert=True),
            adv
        )
        
        with_ss_dpr = with_ss.calculate_dpr(16)['total_dpr']
        without_ss_dpr = without_ss.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== SHARPSHOOTER VALUE (No Advantage) ===")
        print(f"With SS (45% hit, 17.5 dmg): {with_ss_dpr:.2f} DPR")
        print(f"Without SS (70% hit, 7.5 dmg): {without_ss_dpr:.2f} DPR")
        
        # SS should still be worth it because +10 damage > -5 penalty with good to-hit
        assert with_ss_dpr > without_ss_dpr, "Sharpshooter should increase DPR"
        
    def test_archery_feat_value(self):
        """Fighting Initiate (Archery) for Swords Bard who lacks it."""
        adv = AdvantageSource.none()
        
        with_archery = create_swords_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True, fighting_initiate_archery=True),
            adv
        )
        without_archery = create_swords_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True),
            adv
        )
        
        with_dpr = with_archery.calculate_dpr(16)['total_dpr']
        without_dpr = without_archery.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== ARCHERY FEAT VALUE (Swords Bard) ===")
        print(f"With Archery (45% hit): {with_dpr:.2f} DPR")
        print(f"Without Archery (35% hit): {without_dpr:.2f} DPR")
        print(f"Difference: {with_dpr - without_dpr:.2f} DPR (+{(with_dpr/without_dpr - 1)*100:.1f}%)")
        
        # +2 to hit is huge when Sharpshooter is active
        assert with_dpr > without_dpr
        
    def test_elven_accuracy_value_no_advantage(self):
        """Elven Accuracy is USELESS without advantage."""
        adv = AdvantageSource.none()
        
        with_ea = create_bows_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True, elven_accuracy=True),
            adv
        )
        without_ea = create_bows_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True),
            adv
        )
        
        with_dpr = with_ea.calculate_dpr(16)['total_dpr']
        without_dpr = without_ea.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== ELVEN ACCURACY VALUE (No Advantage) ===")
        print(f"With EA: {with_dpr:.2f} DPR")
        print(f"Without EA: {without_dpr:.2f} DPR")
        print(f"Difference: {with_dpr - without_dpr:.2f} DPR")
        
        # Should be IDENTICAL (EA does nothing without advantage)
        assert abs(with_dpr - without_dpr) < 0.01, "EA should have zero value without advantage"


# ==============================================================================
# PART 3: RANGER VS BARD COMPARISON
# ==============================================================================

class TestRangerVsBard:
    """
    Compare Ranger and Bard builds with APPROPRIATE advantage sources.
    
    CRITICAL DIFFERENCE:
    - Bards (full casters): Get 4th level spells at level 7, so level 8 Bards
      have Greater Invisibility for reliable self-advantage
    - Rangers (half casters): Only have 2nd level spells at level 8, 
      NO access to Greater Invisibility, need external advantage sources
    """
    
    def test_bows_bard_with_greater_invisibility(self):
        """Bards have Greater Invisibility at level 8 - this is their advantage source."""
        # Greater Invisibility: affects all attacks for the duration
        greater_invisibility = AdvantageSource("Greater Invisibility", affects_all_attacks=True)
        
        # Bows Bard: CE + EA + SS with Greater Invisibility (constant advantage)
        bard_with_gi = create_bows_bard_build(
            FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True),
            greater_invisibility
        )
        
        # Bows Bard without GI for comparison
        bard_no_adv = create_bows_bard_build(
            FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True),
            AdvantageSource.none()
        )
        
        bard_gi_dpr = bard_with_gi.calculate_dpr(16)['total_dpr']
        bard_no_dpr = bard_no_adv.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== BARD WITH GREATER INVISIBILITY ===")
        print(f"Bows Bard (3 attacks, Greater Invisibility + EA): {bard_gi_dpr:.2f} DPR")
        print(f"Bows Bard (3 attacks, no advantage): {bard_no_dpr:.2f} DPR")
        print(f"Greater Invisibility adds: {bard_gi_dpr - bard_no_dpr:.2f} DPR (+{(bard_gi_dpr/bard_no_dpr - 1)*100:.1f}%)")
        
        # Greater Invisibility should significantly boost DPR
        assert bard_gi_dpr > bard_no_dpr * 1.3, "GI should add at least 30% DPR"
        
    def test_elven_accuracy_value_with_greater_invisibility(self):
        """Elven Accuracy is VALUABLE for Bards because they have Greater Invisibility."""
        greater_invisibility = AdvantageSource("Greater Invisibility", affects_all_attacks=True)
        
        # With EA + Greater Invisibility (EA in feats triggers when advantage present)
        with_ea = create_bows_bard_build(
            FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True),
            greater_invisibility
        )
        
        # Without EA but with Greater Invisibility
        without_ea = create_bows_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True),
            greater_invisibility
        )
        
        with_dpr = with_ea.calculate_dpr(16)['total_dpr']
        without_dpr = without_ea.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== ELVEN ACCURACY VALUE (With Greater Invisibility) ===")
        print(f"With EA (3d20): {with_dpr:.2f} DPR")
        print(f"Without EA (2d20): {without_dpr:.2f} DPR")
        print(f"EA adds: {with_dpr - without_dpr:.2f} DPR (+{(with_dpr/without_dpr - 1)*100:.1f}%)")
        
        # EA should have real value with advantage
        assert with_dpr > without_dpr, "EA should add DPR when you have advantage"
        
    def test_beast_master_vs_bows_bard_realistic(self):
        """Beast Master (pet Help) vs Bows Bard (Greater Invisibility)."""
        # Beast Master: EA + SS, longbow, pet Help, magic items
        bm = create_beast_master_ranger_build(
            FeatSet(elven_accuracy=True, sharpshooter=True),
            Weapon("Longbow", 8, magic_bonus=1),
            MagicItems(bracers_of_archery=True)
        )
        
        # Bows Bard: CE + EA + SS with Greater Invisibility
        greater_invisibility = AdvantageSource("Greater Invisibility", affects_all_attacks=True)
        bard = create_bows_bard_build(
            FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True),
            greater_invisibility
        )
        
        bm_dpr = bm.calculate_dpr(16)['total_dpr']
        bard_dpr = bard.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== BEAST MASTER vs BOWS BARD (Realistic) ===")
        print(f"Beast Master (2 atks, pet Help, magic items): {bm_dpr:.2f} DPR")
        print(f"Bows Bard (3 atks, Greater Invisibility): {bard_dpr:.2f} DPR")
        
        # Both have advantage sources - who wins?
        if bard_dpr > bm_dpr:
            print(f"Bows Bard wins by {bard_dpr - bm_dpr:.2f} DPR")
        else:
            print(f"Beast Master wins by {bm_dpr - bard_dpr:.2f} DPR")
        
    def test_ranger_vs_bard_spell_access_difference(self):
        """
        THE CRITICAL DIFFERENCE: Bards have Greater Invisibility, Rangers don't.
        
        At level 8:
        - Rangers: 2nd level spells max (no GI)
        - Bards: 4th level spells (have GI)
        
        Same feats, same weapon, different spell access = different advantage.
        """
        # Ranger: No self-advantage spell at level 8
        ranger = create_ranger_build(
            FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True),
            Weapon("Hand Crossbow", 6),
            AdvantageSource.none()  # No Greater Invisibility!
        )
        
        # Bard: Has Greater Invisibility
        greater_invisibility = AdvantageSource("Greater Invisibility", affects_all_attacks=True)
        bard = create_bows_bard_build(
            FeatSet(crossbow_expert=True, elven_accuracy=True, sharpshooter=True),
            greater_invisibility
        )
        
        ranger_dpr = ranger.calculate_dpr(16)['total_dpr']
        bard_dpr = bard.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== RANGER vs BARD (Spell Access Difference) ===")
        print(f"Ranger (no GI access): {ranger_dpr:.2f} DPR")
        print(f"Bard (Greater Invisibility): {bard_dpr:.2f} DPR")
        print(f"Bard's spell access advantage: {bard_dpr - ranger_dpr:.2f} DPR (+{(bard_dpr/ranger_dpr - 1)*100:.1f}%)")
        
        # Bard should significantly outperform Ranger due to GI
        assert bard_dpr > ranger_dpr * 1.2, "Bard's GI access should give >20% DPR advantage"


# ==============================================================================
# PART 4: WHAT-IF SCENARIOS
# ==============================================================================

class TestWhatIf:
    """Explore alternative builds and edge cases."""
    
    def test_bows_bard_freed_feat_slot(self):
        """Bows Bard can use freed feat slot for +2 DEX instead of Archery."""
        adv = AdvantageSource.none()
        
        # Swords Bard: CE + SS + Archery (uses 3 feats, DEX 18)
        swords = create_swords_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True, fighting_initiate_archery=True),
            adv
        )
        
        # Bows Bard: CE + SS + DEX (uses 2 combat feats + ASI, simulated as DEX 20)
        # Create manually to set DEX 20
        bows_with_dex = CharacterBuild(
            name="Bows Bard (DEX 20)",
            level=8,
            class_features=ClassFeatures("Bard", "Bows", extra_attack=True, fighting_style_archery=True),
            dex=20,  # +2 DEX from freed feat slot
            proficiency_bonus=3,
            weapon=Weapon("Hand Crossbow", 6),
            feats=FeatSet(crossbow_expert=True, sharpshooter=True),
            advantage_source=adv
        )
        
        swords_dpr = swords.calculate_dpr(16)['total_dpr']
        bows_dpr = bows_with_dex.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== FREED FEAT SLOT VALUE ===")
        print(f"Swords Bard (CE+SS+Archery, DEX 18): {swords_dpr:.2f} DPR")
        print(f"Bows Bard (CE+SS, DEX 20): {bows_dpr:.2f} DPR")
        print(f"Advantage of freed slot: {bows_dpr - swords_dpr:.2f} DPR")
        
        # +2 DEX gives +1 to hit AND +1 damage, should beat Archery-only
        # Bows: +5 DEX +3 Prof +2 Archery -5 SS = +5 to hit, 18.5 damage
        # Swords: +4 DEX +3 Prof +2 Archery -5 SS = +4 to hit, 17.5 damage
        assert bows_dpr > swords_dpr
        
    def test_crossbow_expert_mandatory(self):
        """Without CE, Bard is limited to 1 attack (devastating)."""
        adv = AdvantageSource.none()
        
        with_ce = create_bows_bard_build(
            FeatSet(crossbow_expert=True, sharpshooter=True),
            adv
        )
        without_ce = create_bows_bard_build(
            FeatSet(sharpshooter=True),
            adv
        )
        
        with_dpr = with_ce.calculate_dpr(16)['total_dpr']
        without_dpr = without_ce.calculate_dpr(16)['total_dpr']
        
        print(f"\n=== CROSSBOW EXPERT VALUE ===")
        print(f"With CE (3 attacks): {with_dpr:.2f} DPR")
        print(f"Without CE (2 attacks): {without_dpr:.2f} DPR")
        print(f"CE adds: {with_dpr - without_dpr:.2f} DPR (+{(with_dpr/without_dpr - 1)*100:.1f}%)")
        
        assert with_dpr > without_dpr
