# Release Checklist

Use this checklist for every production release.

## 1. Change Readiness
- [ ] Scope and release notes finalized
- [ ] Breaking changes identified and communicated
- [ ] Rollback owner assigned

## 2. Database and Seeds
- [ ] Migration impact reviewed (schema/index changes)
- [ ] Seeder impact reviewed (`backend/scripts/seed.js`)
- [ ] Backup/snapshot confirmed for production DB
- [ ] Backward compatibility verified for old documents

## 3. Environment Validation
- [ ] Production env vars validated against `docs/ENVIRONMENT_MATRIX.md`
- [ ] JWT/admin defaults are not used in production
- [ ] Frontend and backend URL alignment verified

## 4. CI/Quality Validation
- [ ] Lint gate passed
- [ ] Test gate passed
- [ ] Build gate passed
- [ ] API smoke gate passed

## 5. Deploy and Rollback Plan
- [ ] Deploy strategy confirmed (rolling/blue-green/manual)
- [ ] Rollback command/script validated
- [ ] Previous stable artifact version documented

## 6. Monitoring and Alerting Checks
- [ ] Error tracking receives test event
- [ ] API latency dashboard updating
- [ ] Auth failure dashboard updating
- [ ] Alerts configured for elevated error rate and p95 latency

## 7. Post-Release Verification
- [ ] `/health` endpoint healthy
- [ ] Login + checkout happy path smoke tested
- [ ] Order create/status update verified
- [ ] No new P0/P1 incidents 30 minutes post release
