---
description: Describe when these instructions should be loaded
applyTo: "**"
---

Provide project context and concise coding guidelines the AI should follow when generating code, answering questions, or reviewing changes.

- Do not add unwanted comments in files.
- Add only short, simple instructions.
- Always generate extra `.md` or `.text` files inside: `RestDoc/11-02-2026`.
- Use the exact date format: `dd-mm-yyyy` (example: `11-02-2026`).
- Place this file in the repository at: `.GitHub/instructions` (for VS Code).

MERN development rules (latest practices):

- Use modern, stable versions of React, Node, Express, and MongoDB (or specified DB).
- Project structure: `frontend/` (React) and `backend/` (Node/Express).
- Frontend: functional components, hooks, modular folder structure, and clear separation of UI and logic.
- Backend: controller → service → model separation; keep route handlers thin.
- Use async/await, central error-handling middleware, and input validation.
- Keep functions small and single-responsibility; prefer readability over cleverness.
- Use meaningful variable names and consistent sorting/organization of imports and exports.
- Add only minimal, useful comments — short and clear.
- Avoid unnecessary dependencies; prefer native APIs and lightweight libraries.
- Write code that is easy to read and maintain; use proper formatting and linting.

Generation rules for AI:

- Produce production-minded, maintainable code (avoid quick hacks).
- Keep comments short and practical; do not add unwanted or verbose commentary.
- When creating example or scaffold files, include a short README in `RestDoc/11-02-2026`.
