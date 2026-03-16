# Skill: LLM Model Evaluation Protocol

## Category
problem-solving

## Tags
#llm #evaluation #model-selection #quality #testing

## Description
Systematic protocol for evaluating whether an LLM model is capable of a specific task. Learned from evaluating 3 models for NPC roleplay: the key insight is that evaluation must test the ACTUAL use case with realistic inputs, not just check if the API returns a response.

## Prerequisites
- Clear definition of what "success" looks like for your use case
- At least one test scenario with 5+ turns/interactions
- Ability to call the model programmatically

## Steps
1. **Define success criteria BEFORE testing**
   - What does a good response look like? Write 2-3 example ideal responses.
   - What are the failure modes you care about? (hallucination, mode collapse, off-topic, etc.)
   - What is the minimum acceptable quality bar?

2. **Design a representative test scenario**
   - Use a realistic system prompt (not a toy example)
   - Include 5+ interaction turns that escalate in complexity
   - Include at least one emotionally complex turn
   - Include at least one turn that requires domain-specific knowledge

3. **Run the test — record EVERYTHING**
   - For each turn, record: input, output, latency, token count
   - Grade each response: PERFECT / PASSABLE / MIXED / WRONG / CATASTROPHICALLY WRONG
   - Note specific failure patterns (hallucination, mode collapse, echoing, etc.)

4. **Evaluate honestly**
   - One good response doesn't mean the model works
   - One bad response IS meaningful — instability is a disqualifier for production
   - If > 1 turn out of 5 is WRONG or worse, the model fails
   - "Partially worked" is still a fail for production use

5. **Compare cost and latency**
   - Record $/turn for each model tested
   - Record average latency
   - A model that's 10x more expensive but actually works is better than a free model that doesn't

6. **Document the verdict clearly**
   - State: PASS or FAIL
   - If FAIL: state exactly WHY (with evidence from the test turns)
   - If PASS: state the conditions (what model, what settings, what cost)

## Examples

**NPC Roleplay Evaluation (March 15, 2026):**

| Model | Result | Reason |
|-------|--------|--------|
| TinyLlama 1.1B | FAIL | Cannot hold character, echoes prompts, hallucinated names |
| Phi-3.5 Mini 3.8B | FAIL | Mode collapse to instructional content, cannot roleplay |
| Claude Haiku 4.5 | PASS | In-character from token 1, emotional depth, $0.0009/turn |

## Common Pitfalls
- Testing plumbing: "Did the API return 200?" is not model evaluation
- Testing with toy prompts that don't represent real usage
- Declaring success after 1 turn (context window bugs only show in multi-turn)
- Sunk cost: spending hours tuning prompts for an incapable model instead of switching
- Not recording results — if you don't write it down, the next session will repeat the same tests

## Related Skills
- `skills/code/npc-consciousness-creation.md` — the specific use case this protocol was developed for
- `skills/code/service-health-verification.md` — verify API connectivity before model evaluation

## Origin
March 15, 2026 — Tested 3 models for NPC roleplay. TinyLlama and Phi-3.5 failed despite passing unit tests. Led to the principle: "Unit tests test plumbing, not quality."
