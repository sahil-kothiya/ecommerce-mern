# Engineering Quality Gates

## Required Gates Per Pull Request

1. Static Quality
- `npm run lint` must pass (warnings allowed, no errors)

2. Automated Tests
- `npm test` must pass
- Minimum expectation:
  - Backend unit tests for changed business logic
  - Integration test for changed API routes

3. Build Integrity
- `npm run build` must pass

4. Basic E2E Smoke
- API health smoke in CI must pass (`/health` returns `success: true`)
- Service startup + DB connectivity verified in CI pipeline

## Required Gates Before Release Tag

1. Regression Gate
- CI green on release branch
- No failing smoke checks in the last 24h

2. Security Gate
- No hardcoded secrets in committed files
- Dependency audit triaged for high/critical issues

3. Delivery Gate
- Release checklist completed (`docs/RELEASE_CHECKLIST.md`)

## Ownership
- Author: ensures tests for changed behavior
- Reviewer: validates coverage and risk
- Release owner: validates release checklist and observability checks
