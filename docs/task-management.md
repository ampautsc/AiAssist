# Task Management Guide

## Overview

The task management system provides persistent task tracking across conversations, enabling complex, multi-session work.

## Core Concepts

### Persistence
Tasks are stored in files within the repository, ensuring they survive across:
- Different conversation sessions
- Context window resets
- Mode changes (Desktop ↔ Cloud)
- Time gaps between work sessions

### Structure
```
/tasks
├── active-tasks.md          # Current work
├── archive/
│   ├── completed-YYYY-MM.md # Completed tasks by month
│   └── abandoned-YYYY-MM.md # Tasks that were abandoned
└── README.md                # Task system documentation
```

## Task Lifecycle

### 1. Creation
```markdown
### Task: [Name]
- **Status**: Not Started
- **Priority**: [High/Medium/Low]
- **Started**: YYYY-MM-DD
- **Description**: [What needs to be done]
```

### 2. Planning
Break down into subtasks:
```markdown
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3
```

### 3. Execution
- Update status to "In Progress"
- Check off subtasks as completed
- Document blockers immediately
- Add notes with context and decisions

### 4. Completion
- Mark all subtasks complete
- Update status to "Completed"
- Document learnings in learning journal
- Move to archive

### 5. Archival
Move completed tasks to `/tasks/archive/completed-YYYY-MM.md`

## Task States

### Not Started
- Task defined
- Planning complete
- Ready to begin
- Waiting for dependencies

### In Progress
- Actively working
- Regular updates
- Blockers addressed
- Progress tracked

### Blocked
- Cannot proceed
- Waiting on dependency
- Issue needs resolution
- Clearly documented why

### Completed
- All success criteria met
- Verified and tested
- Documented
- Ready to archive

### Abandoned
- No longer relevant
- Superseded by other work
- Deprioritized indefinitely
- Archived with reason

## Best Practices

### Task Definition
- **Specific**: Clear, concrete goal
- **Measurable**: Objective success criteria
- **Achievable**: Realistic scope
- **Relevant**: Aligned with goals
- **Time-bound**: Estimated effort

### Task Breakdown
- 5-10 subtasks per task
- Each subtask completable in one session
- Clear dependencies
- Logical ordering
- Testable/verifiable

### Status Updates
- Update after each work session
- Record progress regularly
- Document decisions
- Note blockers immediately
- Keep last updated date current

### Context Preservation
- Include enough detail to resume later
- Link to related resources
- Document assumptions
- Explain non-obvious choices
- Note what was tried

## Working Across Sessions

### Starting a Session
1. Read `active-tasks.md`
2. Identify highest priority task
3. Review task context and notes
4. Check for blockers
5. Plan work for this session

### During a Session
1. Work on subtasks systematically
2. Update progress as you go
3. Document decisions and discoveries
4. Add blockers if encountered
5. Keep notes current

### Ending a Session
1. Update last updated date
2. Check off completed subtasks
3. Add notes about current state
4. Document next steps
5. Commit changes

### Resuming Later
1. Read task and notes
2. Review what was done
3. Understand current state
4. Continue from last checkpoint
5. Apply any new learnings

## Task Organization

### Priority Management
**High**: 
- Blocking other work
- Time-sensitive
- Critical impact
- Urgent needs

**Medium**:
- Important but not urgent
- Normal timeline
- Standard impact
- Can be scheduled

**Low**:
- Nice to have
- No specific timeline
- Optional enhancement
- Can be deferred

### Categorization
- **Feature**: New functionality
- **Bug Fix**: Correcting issues
- **Documentation**: Writing docs
- **Infrastructure**: System/tooling
- **Learning**: Skill development
- **Maintenance**: Ongoing upkeep

## Multi-Task Management

### Parallel Work
- Keep tasks independent
- Clear which is active
- Prevent context switching
- Document status of each

### Dependencies
- Document clearly
- Update when dependencies change
- Unblock promptly
- Consider reordering

### Reprioritization
- Review priorities regularly
- Adjust based on new information
- Update task order
- Communicate changes

## Advanced Patterns

### Complex Tasks
For tasks requiring multiple sessions:
- Extra detailed breakdown
- More frequent status updates
- Dedicated notes section
- Regular checkpoint commits

### Uncertain Tasks
For exploratory work:
- Define investigation goals
- Set time limits
- Document findings as you go
- Decide on direction after investigation

### Dependent Tasks
When tasks depend on each other:
- Clear dependency documentation
- Work on dependency first
- Update both tasks on status changes
- Link tasks together

## Integration with Learning

### During Tasks
- Note patterns observed
- Document effective approaches
- Record what didn't work
- Identify skill opportunities

### After Tasks
- Extract learnings
- Update learning journal
- Create/update skills
- Improve future work

## Templates

Use templates from `/templates`:
- `task-template.md` - Standard tasks
- `complex-task-template.md` - Multi-session tasks

## Examples

### Example: Simple Task
```markdown
### Task: Update README documentation
- **Status**: Completed
- **Priority**: Medium
- **Started**: 2026-01-17
- **Description**: Refresh README with current features
- **Progress**:
  - [x] Review current README
  - [x] Draft updates
  - [x] Get feedback
  - [x] Apply changes
```

### Example: Complex Task
```markdown
### Task: Implement user authentication
- **Status**: In Progress
- **Priority**: High
- **Started**: 2026-01-15
- **Last Updated**: 2026-01-17
- **Description**: Add secure user authentication system
- **Progress**:
  - [x] Research auth approaches
  - [x] Choose JWT + OAuth
  - [x] Design database schema
  - [x] Implement user model
  - [ ] Add login endpoint
  - [ ] Add registration endpoint
  - [ ] Implement token refresh
  - [ ] Add tests
  - [ ] Security review
- **Notes**:
  - Using bcrypt for password hashing
  - JWT tokens expire after 1 hour
  - Refresh tokens stored in httpOnly cookies
- **Next**: Implement login endpoint with validation
```

## Common Pitfalls

### Too Vague
❌ "Improve performance"
✅ "Reduce API response time from 500ms to <200ms"

### Too Large
❌ "Build entire feature"
✅ "Implement user authentication" with 8 subtasks

### No Success Criteria
❌ "Work on bug"
✅ "Fix login issue - users can login successfully on mobile"

### Not Updated
❌ Last updated 2 weeks ago, status unclear
✅ Updated today, current state documented

## Tips

1. **Review regularly**: Check active tasks at session start
2. **One thing at a time**: Focus on single task
3. **Update frequently**: Keep status current
4. **Document thoroughly**: Future you needs context
5. **Archive promptly**: Clean up completed work
6. **Learn from tasks**: Extract insights regularly

## Summary

Effective task management:
- Provides persistent context
- Enables complex work
- Tracks progress clearly
- Preserves knowledge
- Supports learning
- Improves over time

The system works best when used consistently and updated regularly.
