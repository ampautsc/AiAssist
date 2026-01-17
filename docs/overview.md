# System Overview

## What is AiAssist?

AiAssist is a personal AI assistant system designed to continuously learn and improve at helping. It's built specifically to work with GitHub Copilot in both Desktop and Cloud/Agent modes, providing a comprehensive infrastructure for persistent task management, continuous learning, and knowledge accumulation.

## Core Principles

### 1. Learn to Be Better
The primary goal is continuous improvement. Every interaction is an opportunity to learn and become more effective at helping.

### 2. Persistent Context
Tasks, learnings, and knowledge persist across conversations through file-based storage in the repository.

### 3. Deep Copilot Integration
Optimized for GitHub Copilot's capabilities in both Desktop and Cloud modes, leveraging agent mode fully.

### 4. Documentation as Code
All knowledge, skills, and instructions are version-controlled and evolve with the system.

### 5. Self-Improvement Loop
Systematic approach to observing, analyzing, documenting, and applying learnings.

## System Architecture

```
AiAssist/
├── .github/
│   └── copilot/
│       └── agent-instructions.md    # Core agent behavior
├── docs/
│   ├── learning-journal.md          # Ongoing learnings
│   ├── mcp-usage.md                 # MCP server patterns
│   └── decisions/                   # Architecture decisions
├── instructions/
│   ├── desktop-mode.md              # Desktop-specific guidance
│   └── cloud-mode.md                # Cloud-specific guidance
├── skills/
│   ├── code/                        # Code-related skills
│   ├── documentation/               # Documentation skills
│   ├── learning/                    # Learning skills
│   ├── problem-solving/             # Problem-solving skills
│   └── communication/               # Communication skills
├── tasks/
│   ├── active-tasks.md              # Current tasks
│   └── archive/                     # Completed tasks
├── mcp-servers/
│   └── [server configs]             # MCP server configurations
└── templates/
    └── [templates]                  # Document templates
```

## Key Components

### Agent Instructions
Located in `.github/copilot/agent-instructions.md`, these provide the core operational guidelines for the AI assistant. They define priorities, protocols, and behavior patterns.

### Task Management System
The `/tasks` directory maintains persistent task state:
- `active-tasks.md`: Current work
- `archive/`: Completed tasks

Tasks persist across conversations, enabling long-running work.

### Learning System
Multiple components support continuous learning:
- **Learning Journal**: Records insights and patterns
- **Skills Library**: Reusable capabilities
- **Documentation**: Grows with experience
- **Decision Records**: Important choices and rationale

### Skills Library
Organized by category (`/skills`), providing reusable patterns for:
- Code review and development
- Problem-solving approaches
- Learning methodologies
- Communication patterns
- Documentation strategies

### MCP Server Integration
Configuration and usage patterns for Model Context Protocol servers that extend capabilities:
- GitHub integration
- File system access
- Development tools
- External services

### Mode-Specific Instructions
Separate guides for Desktop and Cloud Copilot modes, accounting for their different characteristics and constraints.

## How It Works

### 1. Conversation Start
- Load agent instructions
- Check active tasks
- Review recent learnings
- Set context for session

### 2. Task Execution
- Apply relevant skills
- Use appropriate MCP servers
- Follow mode-specific patterns
- Document decisions and progress

### 3. Learning and Improvement
- Reflect on outcomes
- Extract insights
- Update documentation
- Create or refine skills

### 4. Context Preservation
- Update task status
- Commit learnings
- Document decisions
- Persist state to repository

### 5. Next Session
- Previous context available
- Tasks ready to continue
- Learnings inform approach
- System more capable

## Workflows

### Desktop Mode Workflow
```
Edit files locally → Test → Document → Commit → Push
```

### Cloud Mode Workflow
```
Fetch via API → Process → Create PR → Review → Merge
```

### Learning Workflow
```
Experience → Reflect → Document → Apply → Share
```

### Task Workflow
```
Define → Decompose → Execute → Track → Complete → Archive
```

## Benefits

### For Users
- **Persistent context**: Resume work across sessions
- **Continuous improvement**: System gets better over time
- **Knowledge retention**: Nothing is lost
- **Consistent quality**: Systematic approaches

### For the AI Assistant
- **Clear guidance**: Instructions are explicit
- **Structured learning**: Systematic improvement
- **Reusable patterns**: Skills library grows
- **Context awareness**: History informs decisions

## Getting Started

1. **Read agent instructions**: `.github/copilot/agent-instructions.md`
2. **Check active tasks**: `tasks/active-tasks.md`
3. **Review mode guide**: `instructions/desktop-mode.md` or `cloud-mode.md`
4. **Explore skills**: Browse `/skills` for applicable patterns
5. **Start working**: Apply system to real tasks

## Evolution

This system is designed to evolve:
- Skills grow through experience
- Documentation improves with use
- Instructions refine over time
- Patterns emerge and formalize
- Capabilities expand

The goal is a continuously improving AI assistant that becomes more effective at helping with each interaction.

## Next Steps

- [Quick Start Guide](./quick-start.md)
- [Desktop Mode Instructions](../instructions/desktop-mode.md)
- [Cloud Mode Instructions](../instructions/cloud-mode.md)
- [Skills Library](../skills/README.md)
- [Task Management](./task-management.md)
