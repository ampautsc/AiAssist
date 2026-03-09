"""
Unit tests for DPR calculation library
Tests all scenarios from TEST_SCENARIOS.md
"""
import pytest
import math
from utils.dpr_calculator import (
    Attack, AttackSequence, MultiRoundCombat,
    calculate_proficiency_bonus, calculate_ability_modifier
)


class TestBasicCalculations:
    """Test basic helper functions"""
    
    def test_ability_modifier(self):
        assert calculate_ability_modifier(10) == 0
        assert calculate_ability_modifier(18) == 4
        assert calculate_ability_modifier(20) == 5
        assert calculate_ability_modifier(8) == -1
    
    def test_proficiency_bonus(self):
        assert calculate_proficiency_bonus(1) == 2
        assert calculate_proficiency_bonus(4) == 2
        assert calculate_proficiency_bonus(5) == 3
        assert calculate_proficiency_bonus(8) == 3
        assert calculate_proficiency_bonus(9) == 4
        assert calculate_proficiency_bonus(20) == 6


class TestAttackBonus:
    """Test to-hit bonus calculations"""
    
    def test_basic_attack_bonus(self):
        """Level 8 Ranger, DEX 18, +1 Longbow, Archery"""
        attack = Attack(
            ability_mod=4,  # DEX 18
            proficiency=3,  # Level 8
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2,  # Archery
        )
        assert attack.get_to_hit() == 10  # 4+3+1+2
    
    def test_sharpshooter_penalty(self):
        """Same attack with Sharpshooter"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2,
            sharpshooter=True
        )
        assert attack.get_to_hit() == 5  # 4+3+1+2-5


class TestDamageCalculations:
    """Test damage calculations"""
    
    def test_basic_damage(self):
        """Longbow + DEX + magic + Bracers"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            magic_item_damage=2  # Bracers
        )
        # 1d8 (avg 4.5) + 4 DEX + 1 magic + 2 Bracers = 11.5
        assert attack.get_damage_per_hit() == 11.5
    
    def test_sharpshooter_damage(self):
        """Same attack with Sharpshooter"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            magic_item_damage=2,
            sharpshooter=True
        )
        # 4.5 + 4 + 1 + 2 + 10 (SS) = 21.5
        assert attack.get_damage_per_hit() == 21.5
    
    def test_crit_damage(self):
        """Crit doubles dice only"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            magic_item_damage=2
        )
        # Extra d8 = 4.5
        assert attack.get_crit_damage() == 4.5


class TestHitProbability:
    """Test hit probability calculations"""
    
    def test_normal_hit_chance(self):
        """Normal attack vs AC 16"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2
        )
        # To hit: +10, vs AC 16, need 6+ = 15/20 = 0.75
        hit_chance = attack.get_hit_probability(16)
        assert abs(hit_chance - 0.75) < 0.001
    
    def test_sharpshooter_hit_chance(self):
        """Sharpshooter attack vs AC 16"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2,
            sharpshooter=True
        )
        # To hit: +5, vs AC 16, need 11+ = 10/20 = 0.50
        hit_chance = attack.get_hit_probability(16)
        assert abs(hit_chance - 0.50) < 0.001
    
    def test_advantage_hit_chance(self):
        """Advantage attack vs AC 16"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2,
            advantage=True
        )
        # Need 6+, miss on 1-5, advantage: 1 - (5/20)^2 = 0.9375
        hit_chance = attack.get_hit_probability(16)
        assert abs(hit_chance - 0.9375) < 0.001
    
    def test_elven_accuracy_hit_chance(self):
        """Elven Accuracy attack vs AC 16"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2,
            advantage=True,
            elven_accuracy=True
        )
        # Need 6+, miss on 1-5, triple advantage: 1 - (5/20)^3 = 0.984375
        hit_chance = attack.get_hit_probability(16)
        assert abs(hit_chance - 0.984375) < 0.001
    
    def test_elven_accuracy_sharpshooter(self):
        """Elven Accuracy + Sharpshooter vs AC 16"""
        attack = Attack(
            ability_mod=4,
            proficiency=3,
            weapon_damage_dice=8,
            magic_bonus=1,
            fighting_style_to_hit=2,
            sharpshooter=True,
            advantage=True,
            elven_accuracy=True
        )
        # Need 11+, miss on 1-10, triple advantage: 1 - (10/20)^3 = 0.875
        hit_chance = attack.get_hit_probability(16)
        assert abs(hit_chance - 0.875) < 0.001
    
    def test_auto_hit_nat_20(self):
        """Natural 20 always hits even with penalty"""
        attack = Attack(
            ability_mod=-5,
            proficiency=0,
            weapon_damage_dice=8,
        )
        # To hit: -5, vs AC 25, should be 5% (nat 20 only)
        hit_chance = attack.get_hit_probability(25)
        assert abs(hit_chance - 0.05) < 0.001
    
    def test_auto_miss_nat_1(self):
        """Natural 1 always misses even with high bonus"""
        attack = Attack(
            ability_mod=10,
            proficiency=6,
            weapon_damage_dice=8,
            magic_bonus=3
        )
        # To hit: +19, vs AC 5, should be 95% (everything except nat 1)
        hit_chance = attack.get_hit_probability(5)
        assert abs(hit_chance - 0.95) < 0.001


class TestCritProbability:
    """Test critical hit probability"""
    
    def test_normal_crit(self):
        attack = Attack(ability_mod=0, proficiency=0, weapon_damage_dice=8)
        assert abs(attack.get_crit_probability() - 0.05) < 0.001
    
    def test_advantage_crit(self):
        attack = Attack(
            ability_mod=0, proficiency=0, weapon_damage_dice=8,
            advantage=True
        )
        # 1 - (19/20)^2 = 0.0975
        assert abs(attack.get_crit_probability() - 0.0975) < 0.001
    
    def test_elven_accuracy_crit(self):
        attack = Attack(
            ability_mod=0, proficiency=0, weapon_damage_dice=8,
            advantage=True, elven_accuracy=True
        )
        # 1 - (19/20)^3 = 0.142625
        expected = 1 - (0.95 ** 3)
        assert abs(attack.get_crit_probability() - expected) < 0.001


class TestScenarioDPR:
    """Test complete scenarios from TEST_SCENARIOS.md"""
    
    def test_scenario_1_no_sharpshooter_no_help(self):
        """Scenario 1: No Sharpshooter, No Help - 17.7 DPR"""
        # Two normal attacks
        attack1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2
        )
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2
        )
        
        sequence = AttackSequence([attack1, attack2])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: 8.85 + 8.85 = 17.7
        assert abs(result['total_dpr'] - 17.7) < 0.1
    
    def test_scenario_2_sharpshooter_no_help(self):
        """Scenario 2: Sharpshooter, No Help - 21.95 DPR"""
        attack1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        
        sequence = AttackSequence([attack1, attack2])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: 10.975 + 10.975 = 21.95
        assert abs(result['total_dpr'] - 21.95) < 0.1
    
    def test_scenario_3_no_sharpshooter_help(self):
        """Scenario 3: No Sharpshooter, Help Every Round - 20.812 DPR"""
        # Attack 1 has advantage with Elven Accuracy
        attack1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            advantage=True, elven_accuracy=True
        )
        # Attack 2 is normal
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2
        )
        
        sequence = AttackSequence([attack1, attack2])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: ~11.962 + 8.85 = 20.812
        assert abs(result['total_dpr'] - 20.812) < 0.1
    
    def test_scenario_4_sharpshooter_help(self):
        """Scenario 4: Sharpshooter + Help Every Round - 30.43 DPR"""
        # Attack 1: Sharpshooter with Elven Accuracy advantage
        attack1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True, advantage=True, elven_accuracy=True
        )
        # Attack 2: Sharpshooter normal
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        
        sequence = AttackSequence([attack1, attack2])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: ~19.4545 + 10.975 = 30.4295
        assert abs(result['total_dpr'] - 30.43) < 0.1
    
    def test_scenario_5_mixed_strategy(self):
        """Scenario 5: Sharpshooter only on advantaged attack - 28.30 DPR"""
        # Attack 1: Sharpshooter with Elven Accuracy
        attack1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True, advantage=True, elven_accuracy=True
        )
        # Attack 2: Normal, no Sharpshooter
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2
        )
        
        sequence = AttackSequence([attack1, attack2])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: 19.4545 + 8.85 = 28.3045
        assert abs(result['total_dpr'] - 28.30) < 0.1


class TestMultiRoundCombat:
    """Test multi-round combat calculations"""
    
    def test_three_rounds_consistent(self):
        """3 rounds of same strategy"""
        # Create identical rounds (Scenario 4)
        rounds = []
        for _ in range(3):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True, advantage=True, elven_accuracy=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            rounds.append(AttackSequence([attack1, attack2]))
        
        combat = MultiRoundCombat(rounds)
        result = combat.calculate_total_damage(16)
        
        # Expected: 30.43 × 3 = 91.29
        assert abs(result['total_damage'] - 91.29) < 0.2
        assert abs(result['average_dpr'] - 30.43) < 0.1
        assert result['num_rounds'] == 3
    
    def test_scenario_6_help_round_1_only(self):
        """Scenario 6: Help on Round 1, then normal Sharpshooter"""
        rounds = []
        
        # Round 1: Help action used
        attack1_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True, advantage=True, elven_accuracy=True
        )
        attack2_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        rounds.append(AttackSequence([attack1_r1, attack2_r1]))
        
        # Rounds 2-3: No help, both attacks normal with Sharpshooter
        for _ in range(2):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            rounds.append(AttackSequence([attack1, attack2]))
        
        combat = MultiRoundCombat(rounds)
        result = combat.calculate_total_damage(16)
        
        # Expected: 30.43 + 21.95 + 21.95 = 74.33
        assert abs(result['total_damage'] - 74.33) < 0.2


class TestOptimalStrategy:
    """Test to find optimal strategy"""
    
    def test_compare_all_scenarios(self):
        """Compare all 6 scenarios and verify Scenario 4 is optimal"""
        scenarios = {}
        
        # Scenario 1
        rounds1 = [AttackSequence([
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2),
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2)
        ]) for _ in range(3)]
        scenarios['Scenario 1'] = MultiRoundCombat(rounds1).calculate_total_damage(16)['total_damage']
        
        # Scenario 2
        rounds2 = [AttackSequence([
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2, sharpshooter=True),
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2, sharpshooter=True)
        ]) for _ in range(3)]
        scenarios['Scenario 2'] = MultiRoundCombat(rounds2).calculate_total_damage(16)['total_damage']
        
        # Scenario 3
        rounds3 = [AttackSequence([
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                   advantage=True, elven_accuracy=True),
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2)
        ]) for _ in range(3)]
        scenarios['Scenario 3'] = MultiRoundCombat(rounds3).calculate_total_damage(16)['total_damage']
        
        # Scenario 4
        rounds4 = [AttackSequence([
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                   sharpshooter=True, advantage=True, elven_accuracy=True),
            Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2, sharpshooter=True)
        ]) for _ in range(3)]
        scenarios['Scenario 4'] = MultiRoundCombat(rounds4).calculate_total_damage(16)['total_damage']
        
        # Verify Scenario 4 is the highest
        best_scenario = max(scenarios.items(), key=lambda x: x[1])
        assert best_scenario[0] == 'Scenario 4'
        assert abs(best_scenario[1] - 91.29) < 0.2


class TestGloomStalker:
    """Test Gloom Stalker subclass mechanics vs Beast Master
    
    CORRECTED: Umbral Sight advantage only on FIRST attack:
    - Unseen attacker grants advantage
    - After first attack, position is revealed
    - Subsequent attacks in same turn have NO advantage
    - Hiding as action wastes Attack action - not worth it
    
    These tests show the REALISTIC scenario (only first attack gets advantage)
    """
    
    def test_gloom_stalker_round_1_realistic(self):
        """Gloom Stalker Round 1: 3 attacks, advantage ONLY on first"""
        # Attack 1: 2d8 weapon damage + Elven Accuracy advantage (unseen)
        attack1 = Attack(
            ability_mod=4, proficiency=3,
            weapon_damage_dice=8, weapon_damage_count=2,  # 2d8!
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True, advantage=True, elven_accuracy=True
        )
        # Attacks 2-3: Normal, NO advantage (position revealed)
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage!
        )
        attack3 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage!
        )
        
        sequence = AttackSequence([attack1, attack2, attack3])
        result = sequence.calculate_round_dpr(16)
        
        # Expected:
        # Attack 1: 87.5% hit, 26 damage = ~24.03 DPR (2d8 Dread Ambusher)
        # Attacks 2-3: 50% hit, 21.5 damage each = ~10.975 DPR each
        # Total: ~45.98 DPR
        assert abs(result['total_dpr'] - 45.98) < 0.5
        """Gloom Stalker Rounds 2-3: 2 attacks, NO advantage"""
        # Both attacks have NO advantage (not worth hiding)
        attack1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage
        )
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage
        )
        
        sequence = AttackSequence([attack1, attack2])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: ~10.975 + ~10.975 = ~21.95 DPR
        assert abs(result['total_dpr'] - 21.95) < 0.5
    
    def test_gloom_stalker_3_rounds_total(self):
        """Gloom Stalker 3-round combat total damage (REALISTIC)"""
        rounds = []
        
        # Round 1: Dread Ambusher, advantage only on first attack
        attack1_r1 = Attack(
            ability_mod=4, proficiency=3,
            weapon_damage_dice=8, weapon_damage_count=2,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True, advantage=True, elven_accuracy=True
        )
        attack2_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage
        )
        attack3_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage
        )
        rounds.append(AttackSequence([attack1_r1, attack2_r1, attack3_r1]))
        
        # Rounds 2-3: Normal, NO advantage
        for _ in range(2):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            rounds.append(AttackSequence([attack1, attack2]))
        
        combat = MultiRoundCombat(rounds)
        result = combat.calculate_total_damage(16)
        
        # Expected: 45.98 + 21.95 + 21.95 = 89.88
        assert abs(result['total_damage'] - 89.88) < 0.5
    
    def test_gloom_stalker_vs_beast_master(self):
        """Beast Master beats Gloom Stalker even in darkness!"""
        # Beast Master: Pet Help every round, advantage on 1 attack
        bm_rounds = []
        for _ in range(3):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True, advantage=True, elven_accuracy=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            bm_rounds.append(AttackSequence([attack1, attack2]))
        
        bm_combat = MultiRoundCombat(bm_rounds)
        bm_result = bm_combat.calculate_total_damage(16)
        
        # Gloom Stalker: Advantage only on first attack
        gs_rounds = []
        
        # Round 1: Advantage on attack 1 only
        attack1_r1 = Attack(
            ability_mod=4, proficiency=3,
            weapon_damage_dice=8, weapon_damage_count=2,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True, advantage=True, elven_accuracy=True
        )
        attack2_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage
        )
        attack3_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True  # NO advantage
        )
        gs_rounds.append(AttackSequence([attack1_r1, attack2_r1, attack3_r1]))
        
        # Rounds 2-3: NO advantage
        for _ in range(2):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            gs_rounds.append(AttackSequence([attack1, attack2]))
        
        gs_combat = MultiRoundCombat(gs_rounds)
        gs_result = gs_combat.calculate_total_damage(16)
        
        # Verify Beast Master wins even in darkness!
        # Beast Master: ~91.29
        # Gloom Stalker: ~89.88
        assert abs(bm_result['total_damage'] - 91.29) < 0.5
        assert abs(gs_result['total_damage'] - 89.88) < 0.5
        assert bm_result['total_damage'] > gs_result['total_damage']


class TestGloomStalkerRealistic:
    """Test Gloom Stalker WITHOUT Umbral Sight advantage (daylight, non-darkvision enemies)"""
    
    def test_gloom_stalker_no_advantage_round_1(self):
        """Gloom Stalker Round 1: 3 attacks, NO advantage (daylight)"""
        # Attack 1: 2d8 weapon damage, no advantage
        attack1 = Attack(
            ability_mod=4, proficiency=3,
            weapon_damage_dice=8, weapon_damage_count=2,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
            # NO advantage!
        )
        # Attacks 2-3: Normal, no advantage
        attack2 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        attack3 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        
        sequence = AttackSequence([attack1, attack2, attack3])
        result = sequence.calculate_round_dpr(16)
        
        # Expected: 50% hit on all attacks
        # Attack 1: (0.5 × 26) + (0.05 × 4.5) = 13.225
        # Attacks 2-3: (0.5 × 21.5) + (0.05 × 4.5) = 10.975 each
        # Total: ~35.18 DPR
        assert abs(result['total_dpr'] - 35.18) < 0.5
    
    def test_gloom_stalker_no_advantage_3_rounds(self):
        """Gloom Stalker 3 rounds WITHOUT Umbral Sight advantage"""
        rounds = []
        
        # Round 1: Dread Ambusher, no advantage
        attack1_r1 = Attack(
            ability_mod=4, proficiency=3,
            weapon_damage_dice=8, weapon_damage_count=2,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        attack2_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        attack3_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        rounds.append(AttackSequence([attack1_r1, attack2_r1, attack3_r1]))
        
        # Rounds 2-3: Normal, no advantage
        for _ in range(2):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            rounds.append(AttackSequence([attack1, attack2]))
        
        combat = MultiRoundCombat(rounds)
        result = combat.calculate_total_damage(16)
        
        # Expected: 35.18 + 21.95 + 21.95 = 79.08
        assert abs(result['total_damage'] - 79.08) < 0.5
    
    def test_beast_master_beats_gloom_stalker_in_daylight(self):
        """Beast Master beats Gloom Stalker in daylight (no Umbral Sight)"""
        
        # Beast Master: Consistent advantage from pet
        bm_rounds = []
        for _ in range(3):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True, advantage=True, elven_accuracy=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            bm_rounds.append(AttackSequence([attack1, attack2]))
        
        bm_combat = MultiRoundCombat(bm_rounds)
        bm_result = bm_combat.calculate_total_damage(16)
        
        # Gloom Stalker: No advantage in daylight
        gs_rounds = []
        
        # Round 1
        attack1_r1 = Attack(
            ability_mod=4, proficiency=3,
            weapon_damage_dice=8, weapon_damage_count=2,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        attack2_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        attack3_r1 = Attack(
            ability_mod=4, proficiency=3, weapon_damage_dice=8,
            magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
            sharpshooter=True
        )
        gs_rounds.append(AttackSequence([attack1_r1, attack2_r1, attack3_r1]))
        
        # Rounds 2-3
        for _ in range(2):
            attack1 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            attack2 = Attack(
                ability_mod=4, proficiency=3, weapon_damage_dice=8,
                magic_bonus=1, fighting_style_to_hit=2, magic_item_damage=2,
                sharpshooter=True
            )
            gs_rounds.append(AttackSequence([attack1, attack2]))
        
        gs_combat = MultiRoundCombat(gs_rounds)
        gs_result = gs_combat.calculate_total_damage(16)
        
        # Verify Beast Master wins
        # Beast Master: ~91.29
        # Gloom Stalker (no advantage): ~79.08
        assert abs(bm_result['total_damage'] - 91.29) < 0.5
        assert abs(gs_result['total_damage'] - 79.08) < 0.5
        assert bm_result['total_damage'] > gs_result['total_damage']
        
        # Beast Master should deal ~15% more damage
        damage_increase = (bm_result['total_damage'] / gs_result['total_damage']) - 1
        assert damage_increase > 0.10  # At least 10% more


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
