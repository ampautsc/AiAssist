"""
Tests for Summoned Creatures - Phase 1: Wolf Pack

Tests the wolf stat block and Conjure Animals DPR calculations.
"""

import pytest
from utils.summoned_creatures import (
    SummonedCreature, SummonGroup,
    create_wolf, create_wolf_pack
)


class TestWolfStatBlock:
    """Verify wolf stats match Monster Manual."""
    
    def test_wolf_attack_bonus(self):
        """Wolf has +4 to hit."""
        wolf = create_wolf()
        assert wolf.attack_bonus == 4
        
    def test_wolf_damage_dice(self):
        """Wolf deals 2d4+2 damage."""
        wolf = create_wolf()
        assert wolf.damage_dice == 4  # d4
        assert wolf.damage_count == 2  # 2d4
        assert wolf.damage_mod == 2   # +2
        
    def test_wolf_has_pack_tactics(self):
        """Wolf has Pack Tactics."""
        wolf = create_wolf()
        assert wolf.pack_tactics is True
        
    def test_wolf_average_damage(self):
        """Wolf average damage: 2d4+2 = 5 + 2 = 7."""
        wolf = create_wolf()
        result = wolf.calculate_dpr(10, count=1)  # Use low AC to verify damage
        # 2d4 avg = 2 * 2.5 = 5, +2 mod = 7
        assert abs(result['damage_per_hit'] - 7.0) < 0.01


class TestWolfPackDPR:
    """Test wolf pack DPR calculations against AC 16."""
    
    def test_single_wolf_dpr(self):
        """
        Single wolf vs AC 16 with Pack Tactics:
        +4 to hit vs 16 = need 12+ = 45% base
        With advantage: 1 - (0.55)^2 = 69.75%... wait, need 12 means 9 fail values
        Actually: need 12+ means rolls 1-11 fail = 55% fail
        Advantage: 1 - 0.55^2 = 69.75%
        But nat 1 always misses, nat 20 always hits...
        
        Let me just verify the output.
        """
        wolf = create_wolf()
        result = wolf.calculate_dpr(16, count=1)
        
        print(f"\n=== SINGLE WOLF vs AC 16 ===")
        print(f"Hit chance: {result['hit_chance']:.2%}")
        print(f"Crit chance: {result['crit_chance']:.2%}")
        print(f"Damage per hit: {result['damage_per_hit']:.2f}")
        print(f"DPR: {result['total_dpr']:.2f}")
        
        # With Pack Tactics (advantage), hit should be ~64%
        assert 0.60 < result['hit_chance'] < 0.70
        assert result['damage_per_hit'] == 7.0
        
    def test_wolf_pack_8_wolves(self):
        """8 wolves with Pack Tactics vs AC 16."""
        pack = create_wolf_pack(8)
        result = pack.calculate_dpr(16)
        
        print(f"\n=== 8 WOLVES vs AC 16 ===")
        print(f"Hit chance per wolf: {result['hit_chance']:.2%}")
        print(f"DPR per wolf: {result['dpr_per_creature']:.2f}")
        print(f"Total DPR: {result['total_dpr']:.2f}")
        
        # 8 × 5.37 = 42.96 DPR
        assert 41.0 < result['total_dpr'] < 45.0
        
    def test_wolf_pack_expected_value(self):
        """Verify 8 wolves ≈ 42.96 DPR."""
        pack = create_wolf_pack(8)
        result = pack.calculate_dpr(16)
        
        # 8 wolves × 5.37 DPR each = 42.96 DPR
        assert abs(result['total_dpr'] - 42.96) < 1.0, \
            f"Expected ~42.96, got {result['total_dpr']:.2f}"


class TestOpportunityAttacks:
    """Test opportunity attack calculations."""
    
    def test_oa_with_100_percent_trigger(self):
        """OAs with guaranteed trigger should equal normal attacks."""
        pack = create_wolf_pack(8)
        
        normal = pack.calculate_dpr(16)
        oa = pack.calculate_opportunity_attack_dpr(16, trigger_chance=1.0)
        
        assert abs(normal['total_dpr'] - oa['expected_dpr']) < 0.01
        
    def test_oa_with_65_percent_trigger(self):
        """OAs with 65% trigger (Dissonant Whispers fail rate)."""
        pack = create_wolf_pack(8)
        
        oa = pack.calculate_opportunity_attack_dpr(16, trigger_chance=0.65)
        
        print(f"\n=== 8 WOLF OAs (65% trigger) ===")
        print(f"Base DPR: {oa['base_dpr']:.2f}")
        print(f"Expected DPR: {oa['expected_dpr']:.2f}")
        
        # 0.65 × 42.96 = 27.92
        assert abs(oa['expected_dpr'] - 27.92) < 1.0


class TestConjureAnimalsRound:
    """Test full round calculations for Conjure Animals strategy."""
    
    def test_round_1_summon(self):
        """Round 1: Bard summons, wolves attack."""
        pack = create_wolf_pack(8)
        wolves = pack.calculate_dpr(16)
        
        # Bard uses action to summon, no Bard damage
        bard_damage = 0
        total = bard_damage + wolves['total_dpr']
        
        print(f"\n=== ROUND 1: SUMMON ===")
        print(f"Bard (Action: Conjure Animals): 0 damage")
        print(f"8 Wolves: {wolves['total_dpr']:.2f} DPR")
        print(f"Round Total: {total:.2f} DPR")
        
        # Round 1: just wolves = 42.96
        assert abs(total - 42.96) < 1.0
        
    def test_round_2_dissonant_whispers(self):
        """
        Round 2: Dissonant Whispers + OAs + Wolf attacks.
        
        DW: 3d6 = 10.5 avg, 65% fail = 6.83 expected
        OAs: 65% × 42.96 = 27.92
        Wolves: 42.96
        Total: 77.71
        """
        pack = create_wolf_pack(8)
        
        # Dissonant Whispers
        dw_damage = 10.5  # 3d6 average
        dw_fail_rate = 0.65  # DC 15 vs +1 WIS
        dw_expected = dw_damage * dw_fail_rate
        
        # Opportunity attacks (triggered by DW flee)
        oa_result = pack.calculate_opportunity_attack_dpr(16, trigger_chance=dw_fail_rate)
        
        # Normal wolf attacks
        wolves = pack.calculate_dpr(16)
        
        total = dw_expected + oa_result['expected_dpr'] + wolves['total_dpr']
        
        print(f"\n=== ROUND 2: DISSONANT WHISPERS COMBO ===")
        print(f"Dissonant Whispers: {dw_expected:.2f} expected damage")
        print(f"8 Wolf OAs (65% trigger): {oa_result['expected_dpr']:.2f} DPR")
        print(f"8 Wolf Attacks: {wolves['total_dpr']:.2f} DPR")
        print(f"Round Total: {total:.2f} DPR")
        
        # Should be close to 77.71
        assert 75.0 < total < 80.0
