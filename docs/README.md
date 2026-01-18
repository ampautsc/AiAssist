# Documentation Index

This directory contains all documentation for the AI Assistant system.

## Core Documentation

### Getting Started
- [System Overview](./overview.md) - High-level system architecture
- [Quick Start Guide](./quick-start.md) - Get up and running quickly
- [Learning Journal](./learning-journal.md) - Ongoing learnings and insights

### Operational Guides
- [MCP Server Usage](./mcp-usage.md) - How to use MCP servers effectively
- [Task Management](./task-management.md) - Managing persistent tasks
- [Learning System](./learning-system.md) - How the AI learns and improves

### Reference
- [Decision Records](./decisions/) - Important technical decisions
- [Patterns](./patterns/) - Reusable patterns and best practices
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

## Documentation Organization

### `/docs`
Main documentation directory for system-wide documentation.

### `/docs/decisions`
Architecture Decision Records (ADRs) documenting important decisions.

### `/docs/patterns`
Documented patterns and best practices.

### `/instructions`
Specific instruction sets for different contexts and modes.

### `/skills`
Reusable skills organized by category.

## Contributing to Documentation

### When to Document
- After solving a non-trivial problem
- When discovering a useful pattern
- After making an important decision
- When learning something valuable
- Before forgetting key information

### Documentation Standards
- Use clear, concise language
- Include examples where helpful
- Link to related documents
- Keep formatting consistent
- Update regularly

### Documentation Workflow
1. Identify what needs documentation
2. Choose appropriate location and format
3. Write clear, actionable content
4. Include examples and references
5. Link from relevant locations
6. Review and refine

## Documentation Types

### How-to Guides
Step-by-step instructions for accomplishing specific tasks.

**Location**: `/docs` or `/instructions`

### Tutorials
Learning-oriented lessons for skill development.

**Location**: `/docs/tutorials/` (create if needed)

### Reference
Technical reference material for looking up details.

**Location**: `/docs/reference/` or inline in code

### Explanation
Understanding-oriented deep dives into concepts.

**Location**: `/docs` with descriptive names

## Keeping Documentation Current

### Review Schedule
- **Weekly**: Update active task status
- **Monthly**: Review and update frequently-used docs
- **Quarterly**: Audit entire documentation set
- **As-needed**: Update when information changes

### Deprecation Process
1. Mark as deprecated in the document
2. Link to replacement if available
3. Move to `/docs/archive/` after grace period
4. Update all references

### Quality Checklist
- [ ] Accurate and current
- [ ] Clear and well-organized
- [ ] Examples are working
- [ ] Links are valid
- [ ] Formatting is consistent
- [ ] Grammar and spelling correct

## Documentation Best Practices

### Writing Style
- **Active voice**: "Run the command" not "The command should be run"
- **Present tense**: "This does X" not "This will do X"
- **Direct**: Get to the point quickly
- **Consistent**: Use same terms throughout

### Structure
- Start with overview/context
- Organize logically
- Use headings effectively
- Include navigation (links)
- Provide examples

### Maintenance
- Date documents when appropriate
- Note when last updated
- Mark WIP or draft clearly
- Archive obsolete content
- Keep index updated
