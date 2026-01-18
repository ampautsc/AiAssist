# Skill: Code Review Checklist

## Category
Code

## Description
A comprehensive checklist for reviewing code changes, ensuring quality, security, and maintainability.

## Prerequisites
- Access to code changes (PR/diff)
- Understanding of the project context
- Familiarity with the codebase conventions

## Steps

### 1. Understand the Change
- Read the PR description and linked issues
- Understand the problem being solved
- Review the approach and design

### 2. Functionality Review
- [ ] Code solves the stated problem
- [ ] Logic is correct and handles edge cases
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors

### 3. Code Quality
- [ ] Code is readable and maintainable
- [ ] Naming is clear and consistent
- [ ] Functions/methods have single responsibility
- [ ] No unnecessary complexity
- [ ] Comments explain "why" not "what"
- [ ] No commented-out code

### 4. Security Review
- [ ] Input validation is present
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Sensitive data is protected
- [ ] Authentication/authorization is correct
- [ ] No hardcoded secrets

### 5. Performance
- [ ] No obvious performance issues
- [ ] Efficient algorithms used
- [ ] No unnecessary database queries
- [ ] Appropriate caching where needed

### 6. Testing
- [ ] Tests exist and are meaningful
- [ ] Edge cases are tested
- [ ] Tests are maintainable
- [ ] All tests pass

### 7. Documentation
- [ ] Public APIs are documented
- [ ] Complex logic is explained
- [ ] README updated if needed
- [ ] Breaking changes noted

### 8. Style and Conventions
- [ ] Follows project style guide
- [ ] Consistent with existing code
- [ ] Linter passes
- [ ] No unnecessary changes

## Examples

### Security Issue Example
```javascript
// ❌ BAD - SQL Injection vulnerability
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD - Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

### Code Quality Example
```javascript
// ❌ BAD - Unclear naming and too complex
function p(d) {
  return d.filter(x => x.a > 10 && x.b < 20).map(x => x.c * 2);
}

// ✅ GOOD - Clear naming and readable
function processActiveProducts(products) {
  const activeProducts = products.filter(product => 
    product.age > 10 && product.stock < 20
  );
  return activeProducts.map(product => product.price * 2);
}
```

## Common Pitfalls

- **Bikeshedding**: Focusing on style over substance
- **Too nitpicky**: Blocking on minor issues
- **Not testing**: Approving without verifying it works
- **Assuming context**: Not understanding the full picture
- **Ignoring security**: Missing security implications

## Tips

- Be constructive and specific in feedback
- Explain the "why" behind suggestions
- Distinguish between "must fix" and "nice to have"
- Acknowledge good solutions
- Test the code locally when possible
- Look for patterns that could become issues later

## Review Comment Template

```markdown
**Issue**: [What's wrong]
**Impact**: [Why it matters]
**Suggestion**: [How to fix it]
**Example**: [Code example if helpful]
```

## Related Skills
- [Security Review](./security-review.md)
- [Performance Analysis](./performance-analysis.md)
- [Refactoring Patterns](./refactoring-patterns.md)

## References
- OWASP Top 10
- Clean Code principles
- Language-specific style guides
