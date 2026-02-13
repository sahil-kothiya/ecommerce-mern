---
description: Code style and minimal comments policy
applyTo: "**"
---

# Code Style & Comments Policy

## Comments

- Add only short, essential comments explaining "why", not "what"
- No verbose JSDoc blocks in new code
- Keep comments concise and clear

## MERN Best Practices

**Stack:**

- React 18+ (functional components, hooks)
- Node.js + Express (controller → service → model)
- MongoDB (Mongoose ODM)

**Code Quality:**

- Small, single-responsibility functions
- Meaningful variable names
- Async/await pattern
- Central error-handling middleware
- Input validation (client + server)

**Style:**

- Production-minded code (not prototypes)
- Minimal dependencies
- Clean, maintainable code
- Proper formatting and linting

## File Generation

**DO NOT** create summary/documentation files unless user explicitly requests.
See `no-summary-files.instructions.md` for details.

---

**Date:** Feb 12, 2026
