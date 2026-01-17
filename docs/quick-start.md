# Quick Start Guide

Get up and running with the AiAssist system quickly.

## For AI Assistants

### First Conversation

1. **Load Core Instructions**
   ```
   Read: .github/copilot/agent-instructions.md
   ```

2. **Check Active Tasks**
   ```
   Read: tasks/active-tasks.md
   ```

3. **Determine Mode**
   - Desktop mode? Read: `instructions/desktop-mode.md`
   - Cloud mode? Read: `instructions/cloud-mode.md`

4. **Start Working**
   - Apply relevant skills from `/skills`
   - Update tasks as you progress
   - Document learnings

### Every Conversation

```
1. Check tasks/active-tasks.md
2. Review recent entries in docs/learning-journal.md
3. Load relevant skills
4. Work on tasks
5. Update documentation
6. Commit progress
```

## For Users

### Setting Up

1. **Clone the repository**
   ```bash
   git clone https://github.com/ampautsc/AiAssist.git
   cd AiAssist
   ```

2. **Review the system**
   - Read `docs/overview.md` for architecture
   - Check `.github/copilot/agent-instructions.md` for AI behavior
   - Browse `/skills` to see capabilities

3. **Start using**
   - Open in your IDE with Copilot
   - Or use in GitHub Copilot Cloud/Agent mode
   - Reference the appropriate mode guide

### Creating Tasks

1. **Open `tasks/active-tasks.md`**

2. **Copy task template from `templates/task-template.md`**

3. **Fill in task details**
   - Clear description
   - Success criteria
   - Priority and estimated effort

4. **Commit the task**
   ```bash
   git add tasks/active-tasks.md
   git commit -m "Add task: [task name]"
   git push
   ```

### Working with AI Assistant

1. **Start conversation with context**
   ```
   "Please check active tasks and help with [specific task]"
   ```

2. **Let AI manage progress**
   - AI will update task status
   - AI will document learnings
   - AI will commit progress

3. **Review and provide feedback**
   - Check commits for progress
   - Review documentation updates
   - Provide guidance as needed

## Common Scenarios

### Scenario: New Feature Development

1. **Create task** in `tasks/active-tasks.md`
2. **Ask AI** to implement following relevant skills
3. **Review progress** via commits and task updates
4. **Document learnings** in learning journal
5. **Archive task** when complete

### Scenario: Learning Something New

1. **Document investigation** as you learn
2. **Record insights** in `docs/learning-journal.md`
3. **Create skill** if pattern emerges
4. **Apply to future work**

### Scenario: Bug Investigation

1. **Create task** describing the bug
2. **Use problem-solving skills** from library
3. **Document findings** as you investigate
4. **Fix and verify**
5. **Record solution** for future reference

### Scenario: Code Review

1. **Use code review skill** from `/skills/code/`
2. **Follow checklist** systematically
3. **Document patterns** found
4. **Update skills** if new patterns emerge

## Key Files Reference

### Essential Files
- `.github/copilot/agent-instructions.md` - Core AI behavior
- `tasks/active-tasks.md` - Current work
- `docs/learning-journal.md` - Ongoing learnings

### Important Directories
- `/skills` - Reusable capabilities
- `/instructions` - Mode-specific guidance
- `/docs` - All documentation
- `/templates` - Document templates

### Configuration
- `/mcp-servers` - MCP server configs
- `.gitignore` - Git exclusions (create as needed)

## Tips for Success

### For AI Assistants
1. **Always check tasks first**
2. **Apply relevant skills**
3. **Document as you go**
4. **Update status regularly**
5. **Learn from outcomes**

### For Users
1. **Be specific in tasks**
2. **Provide context**
3. **Review AI's work**
4. **Give feedback**
5. **Trust the process**

## Workflow Cheat Sheet

### Desktop Mode
```bash
# Start
git pull

# Work
[AI edits files]
[AI tests locally]
[AI updates docs]

# Finish
git add .
git commit -m "message"
git push
```

### Cloud Mode
```bash
# Start
[AI fetches via API]

# Work
[AI prepares changes]
[AI creates PR]

# Finish
[Review and merge PR]
```

## Getting Help

### Documentation
- Read `docs/overview.md` for architecture
- Check mode-specific instructions
- Browse skills library
- Review learning journal for insights

### Troubleshooting
- Check `docs/troubleshooting.md` (create if needed)
- Review similar past tasks
- Examine decision records
- Ask AI to investigate

## Next Steps

1. **Read the overview**: `docs/overview.md`
2. **Explore skills**: Browse `/skills` directory
3. **Create first task**: Use template from `/templates`
4. **Start working**: Let AI help systematically
5. **Review and improve**: System gets better with use

## Remember

This system is designed to:
- **Learn continuously**
- **Persist context**
- **Improve over time**
- **Help systematically**

Give it a few conversations to build context, and it becomes increasingly effective.
