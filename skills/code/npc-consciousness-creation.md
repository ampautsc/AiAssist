# Skill: NPC Character Consciousness Creation

## Category
code

## Tags
#npc #consciousness #llm #claude #character #roleplay #system-prompt

## Description
Creating a new NPC character that can hold conversation through the Claude API. This covers the full pipeline from character design through system prompt construction to multi-turn conversation validation. The key insight: the system prompt IS the consciousness — it must be rich enough for the model to inhabit, not just a description.

## Prerequisites
- Claude API key configured (`ANTHROPIC_API_KEY` in `.env`)
- `ClaudeAPIProvider` wired in `LLMProvider.js`
- Character template data structure defined

## Steps
1. **Design the character identity**
   - Name, age, role, location
   - Core personality traits (2-3 defining characteristics)
   - Emotional state / current situation
   - What they know and don't know
   - How they relate to players (trust level, wariness, eagerness)

2. **Write the system prompt**
   - First person framing: "You ARE this person"
   - Include specific sensory details (what they're doing when addressed)
   - Define conversation boundaries (what they'll share freely vs. withhold)
   - Set response length expectations (1-2 sentences for casual, longer for emotional moments)
   - Explicit anti-chatbot instruction: "You are NOT an AI assistant"

3. **Create the CharacterContextPackage**
   - Template key (snake_case identifier)
   - System prompt (the consciousness)
   - Personality tags for dynamic behavior
   - Knowledge boundaries (what triggers "I don't know" vs. evasion vs. honest answer)

4. **Register in NPC template data**
   - Add to `npcTemplates` collection
   - Set default model (`claude-haiku-4-5-20251001` for standard NPCs)
   - Configure `max_tokens` (150 for casual, 300 for narrative moments)
   - Set `temperature` (0.8 for natural variation)

5. **Run a 5-turn conversation test**
   - Turn 1: Casual greeting (tests basic in-character response)
   - Turn 2: World-building question (tests lore generation)
   - Turn 3: Personal/emotional question (tests depth and vulnerability)
   - Turn 4: Offer of help (tests trust dynamics and information gating)
   - Turn 5: Promise/commitment (tests character's emotional intelligence)

6. **Evaluate quality — not just plumbing**
   - Is the character in-character from the first token?
   - Do they generate consistent world details across turns?
   - Do they show emotional range appropriate to the topic?
   - Do they push back when a stranger asks personal questions?
   - Would a human player feel like they're talking to a person?

7. **Record the evaluation honestly**
   - If it's not good enough, say so. Don't rubber-stamp.

## Examples

**Bree Millhaven (March 15, 2026):**
- 19-year-old tavern keeper, parents disappeared
- System prompt emphasized warmth + worry + spine
- Claude Haiku nailed it: in-character from token one, emotional depth on turn 3, refused empty promises on turn 5
- Cost: ~$0.0009/turn, sub-2-second latency

**What a BAD result looks like (TinyLlama, Phi-3.5):**
- Hallucinated different character names
- Generated essays about Universal Basic Income instead of staying in character
- Echoed prompts back as structured data
- These models cannot do this task. Don't waste time tuning prompts for incapable models.

## Common Pitfalls
- Testing plumbing ("did a string come back") instead of quality ("does this sound like a real person")
- Using a model too small for the task (< 7B parameters generally can't hold complex personas)
- System prompts that describe the character instead of embodying them
- Not testing multi-turn — single-turn tests miss context window and consistency issues
- Declaring success after one good response (test at least 5 turns)

## Related Skills
- `skills/code/service-health-verification.md` — verify the API endpoint works before testing conversations
- `Sis/Knowledge/Testing_and_Validation.md` — quality over plumbing

## Origin
March 15, 2026 — Built Bree Millhaven consciousness. Tested across TinyLlama (failed), Phi-3.5 (failed), Claude Haiku (succeeded). Established the 5-turn evaluation protocol.
