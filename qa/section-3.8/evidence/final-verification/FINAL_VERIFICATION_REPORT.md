# Final Regression Verification

## Execution

The actual SmartGrow Express server and a fresh, isolated MongoDB process were started on loopback. The run used synthetic test accounts/products, a unique database name and data directory, and a random test-only JWT secret. No production service, remote database, greenhouse, or actuator was used.

Command:

```powershell
node qa\node_modules\c8\bin\c8.js --all --include "backend/**/*.js" --reporter=lcov --reporter=text-summary --reports-dir qa\section-3.9\evidence\coverage-final node --test --test-reporter=tap qa\section-3.8\tests\application.test.cjs
```

The test runner's final evidence was written to this directory. `stdout.txt` is the actual TAP and coverage output; `http-results.json` contains actual requests/responses with passwords and tokens redacted; `backend.log`, `mongodb.log`, and `environment.json` record the local services and isolated data.

## Results

| Test ID | Scenario | Expected result | Baseline | Final actual result | Status | Defect |
|---|---|---|---|---|---|---|
| APP-01 | API landing route | HTTP 200 and service message | HTTP 200 | HTTP 200 | PASS | — |
| APP-02 | Login and protected profile | Login/profile succeed; password omitted | HTTP 200 | HTTP 200; password omitted | PASS | — |
| SG-001 | Public administrator registration | Reject role escalation | HTTP 201; admin account created | HTTP 400; registration rejected | PASS | SG-001 |
| SG-002 | Mixed-case login and duplicate registration | Normalize consistently; reject duplicate | Login HTTP 400 | Login HTTP 200; duplicate HTTP 400 | PASS | SG-002 |
| APP-03 | Authenticated crop creation/calculation | Persist crop and calculate expected total | HTTP 201; total $20.50 | HTTP 201; total $20.50 | PASS | — |
| APP-04 | Anonymous profile/admin access | Deny both requests | HTTP 401 | HTTP 401 | PASS | — |
| SG-003 | Device mutation authorization | Require authentication and farmer/admin role | Anonymous create HTTP 201 | Anonymous HTTP 401; farmer allowed; customer HTTP 403 | PASS | SG-003 |
| SG-004 | Crop/supply basket validation and default quantity | Reject invalid values; preserve omitted-quantity default of 1 | Negative fallback returned -$12.50 | Invalid inputs HTTP 400; valid supply total $13.50; omitted crop and supply quantities defaulted to 1 | PASS | SG-004 |
| APP-05 | Fixture-only routes | Return HTTP 404 in actual application | HTTP 404 | HTTP 404 | PASS | — |
| SG-005 | Simulator import exact-case check | Match tracked filename exactly | Static assertion failed | Static assertion passed | PASS (static only) | SG-005 |

**Summary:** 10 top-level tests, 10 passed, 0 failed, 0 skipped; exit code 0.

The latest backend c8 measurement was 31.96% statements/lines, 59.25% branches, and 17.39% functions. This is a separate final regression measurement; it was not imported into the earlier successful SonarQube analysis.

## Baseline comparison and limits

The preserved baseline was 10 tests with 5 passed and 5 failed. The five failures corresponded to SG-001 through SG-005. The current run passes all 10 top-level tests. The final SG-004 check additionally confirms that omitted quantity still defaults to one while explicit null, zero, negative, and non-numeric inputs are rejected.

SG-005 is only a static exact-case assertion. Docker's Linux engine was unavailable and WSL did not provide a general-purpose Linux distribution, so Linux startup was not executed.
