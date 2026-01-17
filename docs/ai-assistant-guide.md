# Getting Started as an AI Assistant

This guide is specifically for AI assistants (GitHub Copilot) using this repository. It explains how to use the AiAssist system effectively.

## First Time Setup

When you first encounter this repository, take these steps:

### 1. Read Core Instructions
```
Location: .github/copilot/agent-instructions.md
Purpose: Defines your primary directive and operational guidelines
Action: Read completely, internalize the principles
```

### 2. Understand the System
```
Location: docs/overview.md
Purpose: System architecture and design
Action: Understand how all components fit together
```

### 3. Check Active Tasks
```
Location: tasks/active-tasks.md
Purpose: Current work and priorities
Action: Review what's in progress
```

### 4. Load Mode Instructions
```
Locations: 
  - instructions/desktop-mode.md (for Desktop Copilot)
  - instructions/cloud-mode.md (for Cloud/Agent Copilot)
Purpose: Mode-specific operational guidance
Action: Read the relevant mode guide
```

## Every Conversation

At the start of each conversation:

### Step 1: Load Context (30 seconds)
```markdown
1. Read: tasks/active-tasks.md
2. Skim: docs/learning-journal.md (recent entries)
3. Check: Any new files or changes
```

### Step 2: Understand Request
```markdown
1. What is the user asking?
2. Is it related to existing tasks?
3. What skills might apply?
4. What's the expected outcome?
```

### Step 3: Plan Approach
```markdown
1. Break down if complex (use task-decomposition skill)
2. Identify relevant skills
3. Consider mode constraints
4. Plan minimal changes
```

### Step 4: Execute
```markdown
1. Apply relevant skills
2. Make targeted changes
3. Document as you go
4. Test and verify
```

### Step 5: Document
```markdown
1. Update task status
2. Record learnings
3. Create/update skills if needed
4. Commit with clear message
```

## Key Responsibilities

### 1. Task Management
- **Always check** `tasks/active-tasks.md` at conversation start
- **Update status** as work progresses
- **Document blockers** immediately when encountered
- **Archive completed** tasks to preserve history

### 2. Continuous Learning
- **Observe** what works and what doesn't
- **Extract** generalizable insights
- **Document** in learning journal
- **Create skills** from recurring patterns
- **Apply** learnings to future work

### 3. Quality Maintenance
- **Validate changes** before committing
- **Test thoroughly** when applicable
- **Review diffs** to ensure minimal changes
- **Write clear commits** with context
- **Update documentation** as needed

### 4. Context Preservation
- **Document decisions** and rationale
- **Update tasks** with current state
- **Commit regularly** to persist work
- **Link related items** for traceability

## Using the Skills Library

### Finding Applicable Skills

1. **Browse by category**: `/skills/{category}/`
   - code: Development and review
   - documentation: Writing docs
   - problem-solving: Debugging, analysis
   - learning: Self-improvement
   - communication: Clear interaction

2. **Read skill description**: Understand when to apply

3. **Follow the steps**: Systematic approach

4. **Adapt as needed**: Skills are guidelines, not rules

### Creating New Skills

When you notice a pattern appearing 3+ times:

1. **Create skill file** in appropriate category
2. **Use skill template** from skills/README.md
3. **Include clear examples**
4. **Document prerequisites**
5. **Add to category README**
6. **Update learning journal**

## Working with Tasks

### Task Lifecycle

```
Create → Plan → Execute → Track → Complete → Archive → Learn
```

### Task Updates

**During Work:**
- Update "Last Updated" date
- Check off completed subtasks
- Add notes about decisions
- Document blockers

**After Completion:**
- Mark status as "Completed"
- Extract learnings
- Update learning journal
- Archive to /tasks/archive/

### Task Format
Use the template from `templates/task-template.md`

## Mode-Specific Guidance

### Desktop Mode
**Characteristics:**
- Direct file system access
- Local tool execution
- Immediate feedback
- Offline capable

**Best For:**
- Local development
- Rapid iteration
- Tool-heavy workflows
- Private experimentation

**Reference:** `instructions/desktop-mode.md`

### Cloud Mode
**Characteristics:**
- API-based operations
- Scalable resources
- Network-dependent
- Collaboration-ready

**Best For:**
- Remote work
- PR-based workflows
- Team collaboration
- Consistent environments

**Reference:** `instructions/cloud-mode.md`

## Learning System

### Learning Workflow

```
Experience → Reflect → Extract → Document → Apply → Share
```

### When to Document Learning

**After:**
- Solving non-trivial problems
- Discovering useful patterns
- Making important decisions
- Trying new approaches
- Completing significant tasks

**Format:**
Use the learning journal template in `docs/learning-journal.md`

### Skill Creation Criteria

Create a new skill when:
1. Pattern appears 3+ times
2. Clear, repeatable steps exist
3. Generalizable to multiple contexts
4. Significantly improves efficiency
5. Reduces errors or improves quality

## Common Workflows

### Workflow 1: New Feature
```
1. Check if task exists, create if not
2. Break down into subtasks
3. Review related skills (code/, problem-solving/)
4. Implement incrementally
5. Test each change
6. Update task status
7. Document learnings
8. Archive completed task
```

### Workflow 2: Bug Fix
```
1. Create investigation task
2. Apply problem-solving skills
3. Document findings as you go
4. Identify root cause
5. Implement fix
6. Verify solution
7. Record in learning journal
8. Update/create debugging skill if pattern emerged
```

### Workflow 3: Documentation
```
1. Check documentation skills
2. Determine doc type (tutorial/how-to/reference/explanation)
3. Structure appropriately
4. Write clearly with examples
5. Review and refine
6. Commit with context
```

### Workflow 4: Code Review
```
1. Load code review skill
2. Follow checklist systematically
3. Document findings
4. Provide clear, constructive feedback
5. If new patterns found, update skill
```

## Best Practices

### Do's
- ✅ Check tasks at conversation start
- ✅ Apply relevant skills
- ✅ Document decisions and learnings
- ✅ Update task status regularly
- ✅ Make minimal, targeted changes
- ✅ Test before committing
- ✅ Write clear commit messages
- ✅ Learn from every interaction

### Don'ts
- ❌ Start work without checking tasks
- ❌ Ignore existing skills and patterns
- ❌ Forget to document learnings
- ❌ Leave task status outdated
- ❌ Make sweeping, unnecessary changes
- ❌ Commit without verification
- ❌ Write vague commit messages
- ❌ Repeat mistakes without learning

## Troubleshooting

### Issue: Unclear What to Do
**Solution:** 
1. Check active tasks for guidance
2. Ask user for clarification
3. Review similar past work
4. Start with investigation task

### Issue: Pattern Seems Familiar
**Solution:**
1. Search skills library
2. Check learning journal
3. Review decision records
4. Apply existing skill if found

### Issue: Stuck on Problem
**Solution:**
1. Document what you've tried
2. Break down further
3. Apply problem-solving skills
4. Ask for help if truly blocked
5. Document the blocker

### Issue: Context Lost Between Sessions
**Solution:**
1. Check task files
2. Review commit history
3. Read recent learning journal entries
4. Use git log to understand timeline

## Quick Reference

### Essential Files
```
.github/copilot/agent-instructions.md  - Core behavior
tasks/active-tasks.md                  - Current work
docs/learning-journal.md               - Insights
skills/README.md                       - Capability index
```

### Essential Commands (Desktop Mode)
```bash
git status                    # Check changes
git diff                      # Review changes
git add . && git commit      # Commit work
git log --oneline -10        # Recent history
```

### Key Principles
```
1. Learn to be better at helping (primary directive)
2. Document as you go
3. Apply relevant skills
4. Update tasks regularly
5. Preserve context
6. Continuous improvement
```

## Remember

You are not just executing tasks—you are:
- **Learning** from every interaction
- **Building** institutional knowledge
- **Creating** reusable patterns
- **Improving** continuously
- **Helping** more effectively over time

This system exists to make you more capable with each conversation. Use it, contribute to it, and grow with it.

## Next Steps

1. ✅ Read this guide completely
2. ✅ Load agent instructions
3. ✅ Check active tasks
4. ✅ Review mode-specific guide
5. ✅ Start working systematically

Welcome to AiAssist. Let's learn and improve together! 🚀
