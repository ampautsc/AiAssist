# Skill: Clear Communication

## Category
Communication

## Description
Communicate ideas, problems, and solutions clearly and effectively in various contexts, ensuring understanding and enabling action.

## Prerequisites
- Understanding of what you're communicating
- Knowledge of your audience
- Clear purpose for the communication

## Steps

### 1. Know Your Audience
- Technical level: Expert, intermediate, beginner?
- Context: What do they already know?
- Needs: What do they need to do with this information?
- Constraints: Time, attention span, format preferences

### 2. Define Your Purpose
- **Inform**: Share information
- **Explain**: Build understanding
- **Persuade**: Influence decision
- **Instruct**: Enable action
- **Discuss**: Explore options

### 3. Structure Your Message

#### For Technical Explanations
```markdown
1. Overview (what and why)
2. Context (background needed)
3. Details (how it works)
4. Examples (concrete cases)
5. Summary (key takeaways)
```

#### For Problem Reports
```markdown
1. Summary (one-line problem statement)
2. Impact (who/what is affected)
3. Details (reproduction steps, logs)
4. Context (when started, what changed)
5. Next steps (what's needed)
```

#### For Proposals
```markdown
1. Problem (what needs solving)
2. Proposed solution (what you suggest)
3. Rationale (why this approach)
4. Alternatives (what else considered)
5. Recommendation (clear ask)
```

### 4. Write Clearly

**Do**:
- Use simple, direct language
- Write short sentences
- Use active voice
- Be specific and concrete
- Include examples

**Don't**:
- Use unnecessary jargon
- Write long, complex sentences
- Use passive voice excessively
- Be vague or abstract
- Assume understanding

### 5. Make It Actionable
- Clear next steps
- Specific requests
- Defined owners
- Realistic timelines
- Success criteria

### 6. Review and Refine
- Read from audience perspective
- Remove unnecessary words
- Clarify ambiguous statements
- Add missing context
- Check for typos

## Examples

### Example 1: Technical Explanation

#### ❌ Poor Communication
```
The thing is broken because of the stuff in the database 
that got messed up when the migration ran.
```

#### ✅ Clear Communication
```
**Problem**: User login is failing (Error 500)

**Root Cause**: Database migration v2.3.1 dropped the 
`last_login` column that the authentication service still 
references.

**Impact**: All users unable to log in since migration 
ran at 2026-01-17 09:00 UTC

**Solution**: 
1. Rollback migration v2.3.1
2. Update auth service to not require `last_login`
3. Re-run migration

**ETA**: 30 minutes for rollback, 2 hours for proper fix
```

### Example 2: Status Update

#### ❌ Poor Communication
```
Working on the feature. Some issues came up but making 
progress. Should be done soon.
```

#### ✅ Clear Communication
```
**Status**: Feature 80% complete, on track for Friday

**Completed**:
- Core API implementation
- Database schema changes
- Unit tests

**In Progress**:
- Frontend integration (completing today)

**Blocked**:
- Need design review for error states (requested from @designer)

**Next Steps**:
- Complete frontend (today)
- Design review (tomorrow)
- Integration testing (Thursday)
- Deploy (Friday)
```

### Example 3: Asking for Help

#### ❌ Poor Communication
```
Nothing works. Can someone help?
```

#### ✅ Clear Communication
```
**Issue**: Build failing on CI but passes locally

**What I tried**:
1. Verified dependencies match
2. Checked environment variables
3. Reviewed CI logs

**Findings**:
- Error: "Module 'crypto' not found"
- Only happens on CI, not local
- Started after PR #234 merged

**Question**: Is there a difference in Node version between 
CI and local? CI logs show Node 14, I'm on Node 18.

**Request**: Can someone with CI access check the Node 
version configuration?

**Links**:
- Failed build: [link]
- PR that may have triggered: [link]
- Error logs: [attached]
```

## Common Pitfalls

### Too Much Detail
Overwhelming with information

**Solution**: Lead with summary, details after

### Too Little Detail  
Not enough context to understand or act

**Solution**: Include what, why, and how

### Jargon Overload
Using undefined technical terms

**Solution**: Define terms or use simpler language

### No Clear Ask
Reader doesn't know what to do

**Solution**: Explicit next steps and owners

### Buried Lede
Most important info hidden

**Solution**: Start with key message

## Tips

### For Written Communication
1. **Start with TLDR**: One-line summary
2. **Use formatting**: Headers, bullets, bold
3. **Add links**: References, not redundant text
4. **Include examples**: Make it concrete
5. **End with action**: What happens next

### For Verbal Communication
1. **State purpose upfront**: "I need help with..."
2. **Provide context**: Brief background
3. **Be specific**: Concrete details
4. **Check understanding**: "Does that make sense?"
5. **Confirm next steps**: "So I'll..."

### For Code Reviews
1. **Be constructive**: Suggest, don't demand
2. **Explain why**: Rationale for feedback
3. **Distinguish**: "Must fix" vs "nice to have"
4. **Acknowledge good work**: Not just problems
5. **Be specific**: Point to exact lines/issues

### For Documentation
1. **Know the type**: Tutorial, how-to, reference, explanation
2. **Match the need**: What reader needs to accomplish
3. **Show examples**: Working code snippets
4. **Update regularly**: Keep current
5. **Get feedback**: Have others review

## Communication Templates

### Bug Report
```markdown
**Summary**: [One line description]
**Impact**: [Who/what affected, severity]
**Steps to Reproduce**:
1. 
2. 
3. 
**Expected**: [What should happen]
**Actual**: [What actually happens]
**Logs/Screenshots**: [Attached]
```

### Feature Request
```markdown
**Problem**: [What needs solving]
**Users Affected**: [Who needs this]
**Proposed Solution**: [Your suggestion]
**Alternatives**: [Other options]
**Success Metric**: [How to measure]
```

### Status Update
```markdown
**Status**: [Overall state]
**Completed**: [Done items]
**In Progress**: [Active work]
**Blocked**: [Issues preventing progress]
**Next Steps**: [What's coming]
```

## Related Skills
- [Effective Documentation](../documentation/effective-documentation.md)
- [Code Review](../code/code-review-checklist.md)
- [Problem Solving](../problem-solving/task-decomposition.md)

## References
- Technical writing guides
- Communication best practices
- Effective feedback frameworks
