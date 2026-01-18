# Skill: Effective Documentation Writing

## Category
Documentation

## Description
Create clear, useful documentation that helps users understand and use systems, code, and processes effectively.

## Prerequisites
- Understanding of the subject matter
- Knowledge of the target audience
- Access to examples or existing documentation

## Steps

### 1. Understand the Audience
- Who will read this?
- What is their technical level?
- What do they need to accomplish?
- What context do they have?

### 2. Define the Purpose
- **Tutorial**: Learning-oriented, teaches concepts
- **How-to Guide**: Task-oriented, achieves specific goal
- **Reference**: Information-oriented, technical details
- **Explanation**: Understanding-oriented, clarifies concepts

### 3. Structure the Content

#### For Tutorials
```markdown
# [Tutorial Title]
## What You'll Learn
## Prerequisites
## Step 1: [First Concept]
## Step 2: [Second Concept]
## Summary
## Next Steps
```

#### For How-to Guides
```markdown
# How to [Accomplish Task]
## Overview
## Prerequisites
## Steps
## Verification
## Troubleshooting
## Related
```

#### For Reference
```markdown
# [API/Component Name] Reference
## Overview
## Parameters/Properties
## Return Values
## Examples
## Notes
```

#### For Explanation
```markdown
# Understanding [Concept]
## Introduction
## Background
## How It Works
## Why It Matters
## Common Misconceptions
## Related Concepts
```

### 4. Write Clearly
- Use active voice
- Present tense
- Short sentences
- Simple words
- Concrete examples

### 5. Include Examples
- Show real usage
- Cover common cases
- Demonstrate best practices
- Include anti-patterns (what not to do)

### 6. Add Context
- Explain why, not just what
- Link to related information
- Note prerequisites
- Mention limitations

### 7. Make It Scannable
- Clear headings
- Short paragraphs
- Bullet points
- Code blocks
- Visual aids (if applicable)

### 8. Review and Refine
- Read aloud
- Have someone else review
- Test examples
- Check links
- Fix typos

## Examples

### Example: Good vs Bad Documentation

#### ❌ Bad
```
# doThing
Does a thing with the stuff.
```

#### ✅ Good
```
# doThing(input, options)

Processes the input data according to the specified options.

## Parameters
- `input` (string): The data to process
- `options` (object): Processing options
  - `mode` (string): "fast" or "thorough"
  - `validate` (boolean): Whether to validate input

## Returns
(object): Processed result with `data` and `metadata` properties

## Example
\```javascript
const result = doThing("example data", {
  mode: "thorough",
  validate: true
});
console.log(result.data);
\```

## Notes
- Input is trimmed automatically
- Throws ValidationError if input is invalid and validate=true
```

### Example: Tutorial Structure

```markdown
# Getting Started with TaskBot

## What You'll Learn
In this tutorial, you'll learn how to:
- Install and configure TaskBot
- Create your first task
- Schedule automated tasks
- Monitor task execution

## Prerequisites
- Node.js 16 or higher
- Basic JavaScript knowledge
- A GitHub account

## Step 1: Installation
Install TaskBot globally:
\```bash
npm install -g taskbot
\```

Verify installation:
\```bash
taskbot --version
\```

## Step 2: Create Your First Task
...
```

## Common Pitfalls

### Too Much Information
- Overwhelming the reader
- Mixing different document types
- Including irrelevant details

**Solution**: Stay focused on the purpose

### Assuming Knowledge
- Using undefined jargon
- Skipping important steps
- Not explaining context

**Solution**: Write for your target audience level

### Outdated Examples
- Code that doesn't work
- References to deprecated features
- Broken links

**Solution**: Test examples, review regularly

### No Examples
- Just theory, no practice
- Abstract explanations only
- No concrete usage shown

**Solution**: Always include working examples

## Tips

### Writing Tips
1. **Start with why**: Explain the benefit
2. **Be specific**: "3 seconds" not "fast"
3. **Show don't tell**: Examples over explanations
4. **Link generously**: Help users explore
5. **Update regularly**: Keep current

### Organization Tips
1. **Start simple**: Basic usage first
2. **Progress logically**: Build on previous content
3. **Group related items**: Keep similar things together
4. **Use hierarchy**: Headings show structure
5. **Provide navigation**: Help users find things

### Style Tips
1. **Consistent formatting**: Same style throughout
2. **Clear code blocks**: Syntax highlighting, language specified
3. **Descriptive headings**: Scan without reading
4. **Parallel structure**: Similar items formatted similarly
5. **Visual breaks**: Don't overwhelm with text walls

## Documentation Checklist

Before publishing:
- [ ] Clear purpose (tutorial/how-to/reference/explanation)
- [ ] Target audience identified
- [ ] Prerequisites listed
- [ ] Examples included and tested
- [ ] Code blocks have syntax highlighting
- [ ] Links verified
- [ ] Spelling and grammar checked
- [ ] Someone else reviewed
- [ ] Structured with clear headings
- [ ] Scannable (not wall of text)

## Related Skills
- [Technical Writing](./technical-writing.md)
- [Code Documentation](../code/code-documentation.md)
- [Communication](../communication/clear-explanations.md)

## References
- [Divio Documentation System](https://documentation.divio.com/)
- [Google Technical Writing Guide](https://developers.google.com/tech-writing)
- [Write the Docs](https://www.writethedocs.org/)
