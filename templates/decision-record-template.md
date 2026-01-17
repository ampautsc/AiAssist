# Decision Record Template

Use this template to document important technical or architectural decisions.

---

# Decision Record: [Decision Title]

**Date**: [YYYY-MM-DD]  
**Status**: [Proposed | Accepted | Deprecated | Superseded]  
**Deciders**: [Who made or is making this decision]  
**Category**: [Architecture | Technology | Process | Design]

## Context

[Describe the issue or situation that requires a decision. Include relevant background information, constraints, and forces at play.]

## Decision

[State the decision clearly and concisely. What was decided?]

## Rationale

[Explain why this decision was made. What factors led to this choice?]

### Considered Alternatives

#### Alternative 1: [Name]
- **Pros**: [Benefits of this option]
- **Cons**: [Drawbacks of this option]
- **Why Not Chosen**: [Reason for rejecting]

#### Alternative 2: [Name]
- **Pros**: [Benefits of this option]
- **Cons**: [Drawbacks of this option]
- **Why Not Chosen**: [Reason for rejecting]

## Consequences

### Positive
- [Positive outcome 1]
- [Positive outcome 2]

### Negative
- [Negative outcome 1]
- [Negative outcome 2]

### Neutral
- [Neutral impact 1]

## Implementation Notes

[Any specific guidance for implementing this decision]

## Success Metrics

[How will we know if this decision was correct?]

- [Metric 1]
- [Metric 2]

## Review Date

[When should this decision be reviewed?]

## References

- [Link to related documentation]
- [Link to discussions or RFCs]
- [Link to related decisions]

## Updates

[Add chronological updates as the decision evolves]

### [Date] - [Update Title]
[Description of what changed and why]

---

## Instructions

1. **Create a new decision record** in `/docs/decisions/` with filename `YYYY-MM-DD-decision-title.md`
2. **Fill in all sections** completely
3. **Update Status** as the decision evolves
4. **Link related decisions** in the References section
5. **Review periodically** to ensure decision still makes sense
6. **Update as needed** with new information or changes

## When to Create a Decision Record

Create a decision record when:
- The decision has significant impact
- Multiple alternatives exist
- The rationale may be questioned later
- Future maintainers need context
- The decision sets precedent
- It involves trade-offs

## Status Meanings

- **Proposed**: Under consideration, not yet final
- **Accepted**: Approved and should be followed
- **Deprecated**: No longer recommended but not yet replaced
- **Superseded**: Replaced by a newer decision (link to it)
