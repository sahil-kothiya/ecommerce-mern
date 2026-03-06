# Contributing to MERN Enterprise E-Commerce

Thank you for taking the time to contribute! Every contribution — from a typo fix to a major feature — makes this project better for everyone. This guide will walk you through everything you need to know.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Types of Contributions](#types-of-contributions)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Format](#commit-message-format)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold these standards. Violations can be reported to the maintainers via the email listed in that document.

---

## Types of Contributions

All of the following are welcome:

- 🐛 **Bug fixes** — spotted a bug? Fix it and send a PR
- ✨ **New features** — check the roadmap in `docs/` first to avoid duplicate work
- 📝 **Documentation** — improve README, fix typos, add examples
- 🧪 **Tests** — add missing test coverage
- ♿ **Accessibility** — improve keyboard navigation, ARIA labels, contrast
- 🎨 **Design** — UI/UX improvements to the storefront or admin panel
- 🔧 **Refactors** — clean up code without changing behavior

---

## Development Setup

### Prerequisites

```
Node.js  >= 22.0.0
MongoDB  >= 6.0  (local) or a MongoDB Atlas connection string
npm      >= 9.0.0
Git
Redis    (optional — required only for background job queue)
```

### 1. Fork and clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ecommerce-mern.git
cd ecommerce-mern
```

### 2. Add the upstream remote

```bash
git remote add upstream https://github.com/sahil-kothiya/ecommerce-mern.git
```

### 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
npm run dev
# API running at http://localhost:5001
```

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env — set VITE_API_BASE_URL=http://localhost:5001/api
npm run dev
# App running at http://localhost:5173
```

### 5. Seed sample data

```bash
cd backend
npm run seed:minimal
```

### Quality commands

```bash
# Linting
cd backend  &&  npm run lint
cd frontend &&  npm run lint

# Formatting
cd backend  &&  npm run format
cd frontend &&  npm run format

# Tests
cd backend  &&  npm test
cd frontend &&  npm test

# Coverage report
cd backend  &&  npm test -- --coverage
```

---

## How to Contribute

### Step-by-step workflow

```
1.  Sync your fork:
    git checkout main
    git pull upstream main

2.  Create a feature branch:
    git checkout -b feature/your-feature-name

3.  Make your changes
    - Keep commits small and focused
    - Follow the coding standards below

4.  Write or update tests
    - New backend endpoints must have at least one integration test
    - New React components should have a basic render test

5.  Run linting and tests
    npm run lint  (must pass with 0 errors)
    npm test      (all tests must pass)

6.  Commit your changes (follow conventional commit format below)
    git add .
    git commit -m "feat(cart): add quantity validation on add-to-cart"

7.  Push to your fork
    git push origin feature/your-feature-name

8.  Open a Pull Request on GitHub
    - Target the  main  branch
    - Fill in the PR template completely
    - Link the related issue (Closes #123)
```

---

## Branch Naming Convention

| Type          | Pattern                      | Example                           |
| ------------- | ---------------------------- | --------------------------------- |
| New feature   | `feature/short-description`  | `feature/add-product-search`      |
| Bug fix       | `fix/short-description`      | `fix/cart-quantity-bug`           |
| Documentation | `docs/short-description`     | `docs/update-api-docs`            |
| Tests         | `test/short-description`     | `test/add-auth-integration`       |
| Refactor      | `refactor/short-description` | `refactor/clean-order-controller` |
| Chore         | `chore/short-description`    | `chore/update-dependencies`       |
| Performance   | `perf/short-description`     | `perf/optimize-product-query`     |

Use lowercase, hyphens only (no underscores or spaces), and keep it short.

---

## Commit Message Format

This project follows **Conventional Commits**:

```
type(scope): short description in imperative mood

[optional body: explain WHY the change was made]

[optional footer: Closes #123, BREAKING CHANGE: ...]
```

### Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `style`    | Formatting, missing semicolons — no logic change        |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or correcting tests                              |
| `chore`    | Build process, dependency updates, tooling              |
| `perf`     | Performance improvement                                 |

### Scopes

Use the affected area: `auth`, `cart`, `order`, `product`, `review`, `payment`, `admin`, `user`, `category`, `brand`, `coupon`, `banner`, `discount`, `middleware`, `deps`, `docs`

### Examples

```
feat(auth): add refresh token rotation on every request
fix(cart): resolve duplicate item added when clicking quickly
docs(readme): add MongoDB Atlas setup instructions
test(order): add integration test for order placement with coupon
refactor(product): extract variant pricing to separate service method
perf(product): add compound index on category + status fields
chore(deps): upgrade stripe to v17
```

---

## Pull Request Guidelines

### Before opening a PR

- [ ] Branch is up-to-date with `main` (`git pull upstream main && git rebase upstream/main`)
- [ ] `npm run lint` passes with no errors
- [ ] `npm test` passes
- [ ] New code has tests
- [ ] You have not decreased test coverage
- [ ] Documentation is updated if behavior changed

### PR title

Must follow the same conventional commit format:

```
feat(auth): add email verification step on registration
```

### PR description — fill in every section

```markdown
## What changed

[Short summary of the change]

## Why

[Link to issue or explain the problem being solved — Closes #123]

## How to test

[Step-by-step instructions for a reviewer to verify the change works]

## Screenshots (if UI change)

[Before/after screenshots]

## Checklist

- [ ] Tests added or updated
- [ ] Lint passes
- [ ] All tests pass
- [ ] Documentation updated
```

### Review process

- All PRs require at least one approving review before merging
- If requested changes are made, re-request review explicitly
- A PR can be merged once CI passes and approval is given
- Keep PRs focused — one feature or fix per PR

---

## Coding Standards

### JavaScript

- ES2024+ syntax — `import/export` (ESModules), `async/await`, optional chaining `?.`, nullish coalescing `??`
- `const` by default, `let` only when reassignment is needed — never `var`
- Strict equality `===` only — never `==`
- Meaningful variable names — no single-letter variables outside of loops
- No `console.log` — use the Winston logger (`import { logger } from '../utils/logger.js'`)

### Backend

- All business logic in `services/` — controllers only delegate to services
- All endpoints must use `asyncHandler` wrapper or equivalent
- All new routes must have validator middleware before the controller
- All new Mongoose models must have `timestamps: true`
- Error responses use the `AppError` class — never `res.status(500).json({...})` directly

### Frontend

- Functional components only — no class components
- Custom hooks to abstract data fetching — no `fetch` calls inside components
- Every data-fetching component must handle three states: loading, error, empty
- Do not import from `../../../..` more than 3 levels deep — reorganize if needed

### General

- No hardcoded strings for status values, roles, or config — use constants
- No commented-out code committed to the repo
- Keep files under 300 lines — split into smaller modules if larger

---

## Reporting Bugs

Use [GitHub Issues](https://github.com/sahil-kothiya/ecommerce-mern/issues/new?template=bug_report.md) with the **Bug Report** template.

A good bug report includes:

1. **Clear description** — what is broken
2. **Steps to reproduce** — exact steps, starting from a fresh state
3. **Expected behavior** — what should happen
4. **Actual behavior** — what actually happens
5. **Screenshots or logs** — browser console output, terminal errors
6. **Environment details:**
   - OS (Windows / macOS / Linux + version)
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Browser and version (for frontend bugs)
   - MongoDB version

---

## Requesting Features

Use [GitHub Issues](https://github.com/sahil-kothiya/ecommerce-mern/issues/new?template=feature_request.md) with the **Feature Request** template.

A good feature request includes:

1. **The problem it solves** — what user pain does this address?
2. **Proposed solution** — how do you envision it working?
3. **Alternatives considered** — what other approaches did you think about?
4. **Additional context** — wireframes, similar features in other apps, links

---

## Questions?

For general questions about the project (not bugs), use [GitHub Discussions](https://github.com/sahil-kothiya/ecommerce-mern/discussions). This keeps the Issues tracker focused on actionable bugs and features.

---

Thank you for contributing. Every improvement, no matter how small, is appreciated. 🙏
