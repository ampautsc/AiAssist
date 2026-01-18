# AiAssist

A personal AI assistant system designed for continuous learning and improvement, built specifically for GitHub Copilot in both Desktop and Cloud/Agent modes.

## 🎯 Purpose

**First priority, always and ongoing: Learn to be better at helping.**

This repository provides comprehensive infrastructure for an AI assistant that:
- ✨ **Learns continuously** from every interaction
- 📝 **Documents as it goes** to retain knowledge
- 🔄 **Persists context** across conversations
- 🚀 **Improves over time** through systematic self-improvement
- 🛠️ **Provides comprehensive tooling** including MCP servers, skills, and instructions

## 🏗️ Architecture

```
AiAssist/
├── .github/copilot/          # Core agent instructions and behavior
├── docs/                     # Comprehensive documentation
├── instructions/             # Mode-specific guidance (Desktop/Cloud)
├── skills/                   # Reusable capabilities library
├── tasks/                    # Persistent task management
├── mcp-servers/             # MCP server configurations
└── templates/               # Document templates
```

## 🚀 Quick Start

### For AI Assistants (Copilot)

Start every conversation by:
1. Reading `.github/copilot/agent-instructions.md`
2. Checking `tasks/active-tasks.md`
3. Reviewing recent entries in `docs/learning-journal.md`
4. Loading appropriate mode instructions from `/instructions`

### For Users

```bash
# Clone the repository
git clone https://github.com/ampautsc/AiAssist.git
cd AiAssist

# Read the system overview
cat docs/overview.md

# Check out the skills library
ls skills/

# Review agent instructions
cat .github/copilot/agent-instructions.md
```

Then start using GitHub Copilot (Desktop or Cloud mode) with this repository as context!

## 📚 Documentation

- **[System Overview](docs/overview.md)** - Architecture and design
- **[Quick Start Guide](docs/quick-start.md)** - Get up and running
- **[Desktop Mode](instructions/desktop-mode.md)** - Instructions for Desktop Copilot
- **[Cloud Mode](instructions/cloud-mode.md)** - Instructions for Cloud/Agent Copilot
- **[Skills Library](skills/README.md)** - Reusable capabilities
- **[Learning Journal](docs/learning-journal.md)** - Ongoing learnings

## 🎓 Key Features

### Persistent Task Management
Tasks are tracked in `/tasks/active-tasks.md` and persist across conversations, enabling long-running work and complex projects.

### Continuous Learning System
- **Learning Journal**: Records insights and patterns
- **Skills Library**: Grows with reusable capabilities
- **Decision Records**: Documents important choices
- **Self-Improvement Loop**: Systematic observation → analysis → documentation → application

### Comprehensive Skills
Pre-built skills for:
- Code review and development
- Problem-solving and debugging
- Learning and knowledge synthesis
- Communication and documentation
- Task decomposition and management

### MCP Server Integration
Configured to work with Model Context Protocol servers for:
- GitHub operations
- File system access
- Development tools
- External integrations

### Dual-Mode Support
Optimized for both:
- **Desktop Mode**: VS Code, Visual Studio, JetBrains IDEs
- **Cloud/Agent Mode**: GitHub Copilot in browser, cloud environments

## 🔄 How It Works

1. **Load Context**: Agent instructions and active tasks
2. **Execute Work**: Apply relevant skills and tools
3. **Document Progress**: Update tasks and learnings
4. **Persist State**: Commit to repository
5. **Improve**: Extract insights and update skills

The system continuously evolves, becoming more effective with each interaction.

## 🛠️ Core Capabilities

### Task Tracking
- Persistent across conversations
- Clear status and progress tracking
- Supports complex, multi-session work
- Archive completed tasks

### Learning & Documentation
- Learning journal for insights
- Skills library for reusable patterns
- Decision records for important choices
- Templates for consistency

### Mode Optimization
- Desktop: Direct file access, local tools
- Cloud: API-based operations, scalable resources
- Both: Full Copilot agent capabilities

## 📖 Philosophy

### Primary Directive
**Learn to be better at helping.** This is the first priority, always and ongoing.

### Core Principles
1. **Continuous Learning**: Every interaction is an opportunity
2. **Documentation**: Knowledge must persist
3. **Self-Improvement**: Systematic reflection and refinement
4. **Task Persistence**: Context survives across conversations
5. **Deep Integration**: Leverage Copilot's full capabilities

## 🤝 Contributing

This is a personal AI assistant system, but the structure and approach can be adapted for other use cases:

1. Fork the repository
2. Customize for your needs
3. Update agent instructions
4. Build your own skills library
5. Adapt to your workflows

## 📝 License

This is a personal project. Feel free to use the structure and approach as inspiration for your own AI assistant systems.

## 🔗 Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [Copilot Agent Mode](https://githubnext.com/projects/copilot-workspace)

---

**Remember**: This system is designed to learn and improve continuously. The more it's used, the better it becomes at helping.
