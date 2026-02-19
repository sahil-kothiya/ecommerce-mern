# Roadmap: MVP Checkout Complete

## Goal
Ship a stable ecommerce MVP where a customer can register, recover account access, browse, wishlist, checkout, and track orders.

## Scope Definition
MVP checkout is complete when all items below are live in production:

1. Auth recovery
- Forgot password request
- Reset password flow
- Session expiry handling with clear UX

2. Wishlist
- Add/remove item
- View persisted wishlist
- Move item to cart

3. Account page
- Profile view/edit
- Address basics
- Order history list

4. Category page
- Category route by slug
- Product list by category
- Empty/loading/error states

5. Order tracking
- Customer order list/detail
- Status progression (`new`, `process`, `delivered`, `cancelled`)
- Tracking number display when present

## Delivery Plan

## Phase 1 (Week 1-2): Reliability Baseline
- Close auth recovery flow end-to-end
- Remove placeholder routes/pages from MVP path
- Lock CI baseline: lint, test, build, API smoke

## Phase 2 (Week 3-4): Core Customer Journey
- Wishlist + account hardening
- Category browsing quality pass (filtering/perf/error handling)
- Checkout order creation and post-order confirmation quality checks

## Phase 3 (Week 5-6): Operations Readiness
- Release checklist enforcement
- Dashboards and alerts for API/auth failures
- Runbook and deployment docs finalized

## Exit Criteria
- P0/P1 defects for checkout path: 0 open
- CI pass rate >= 95% on default branch
- Smoke checks green for 7 consecutive days
- Monitoring alerts configured and tested
