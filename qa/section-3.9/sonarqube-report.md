# Section 3.9 — Quality Metrics & SonarQube

## Analysis method

The original EC4206 task list requires a SonarQube analysis, coverage, defect density, code smells, technical debt, and two or three improvements based on the findings. SonarQube was therefore run locally rather than treating static source checks as a substitute.

The scan used SonarQube Server `26.1.0.118079`, the installed `@sonar/scan` `5.1.0` npm scanner, Node.js `v26.13.0`, and JDK 21. The service was bound to `127.0.0.1`; analysis ran against project key `smartgrow-ec4206-local` on 25 November 2026. Scanner JRE and engine downloads were served by that local instance. Authentication was used for analysis, and the temporary scanner token was revoked after the results were collected.

The scope was `backend` and `frontend/src`. Test directories, `node_modules`, package-lock files, generated `dist`, and QA evidence were excluded from source analysis. The scanner indexed 92 files, detected four languages, and confirmed that it imported the generated LCOV file. The report is based on the submitted analysis, not an estimate.

Coverage was generated with `c8 --all --include "backend/**/*.js"` while the real-backend regression suite ran against isolated MongoDB. This measures backend JavaScript only; the SonarQube aggregate coverage also includes frontend sources, for which this run did not generate coverage.

After retrieving the actual 17 hotspot records from the local project, each rule location and relevant use was reviewed against the source. The individual assessments are in [`hotspot-review.md`](hotspot-review.md). SonarQube's own status remained `TO_REVIEW` for every hotspot; the local source review does not change the measured 0% server-reviewed metric. A genuine dashboard and hotspot-list screenshot are in [`evidence/screenshots/`](evidence/screenshots/).

## Measured results

| Metric | Actual result |
|---|---:|
| Analysis status | Successful |
| Quality gate | OK |
| SonarQube aggregate coverage | 25.0% |
| Backend `c8` statement/line coverage | 31.93% |
| Backend `c8` branch coverage | 50.80% |
| Backend `c8` function coverage | 17.39% |
| Bugs | 23 |
| Vulnerabilities | 0 |
| Security hotspots | 17 |
| Security hotspots reviewed | 0% |
| Code smells | 954 |
| Duplicated lines density | 4.5% |
| Technical debt (`sqale_index`) | 5,373 minutes (89.55 hours) |
| Technical-debt ratio | 0.7% |
| Analyzed source lines (`ncloc`) | 24,424 |
| Total lines | 26,241 |

SonarQube does not provide the assignment’s reproduced-defect density as a direct metric. Using the five defects reproduced in the preserved baseline and the SonarQube `ncloc` denominator gives:

```text
5 reproduced baseline defects / 24.424 KLOC = 0.2047, or 0.20 defects per KLOC
```

This is a transparent project-level calculation, not SonarQube’s count of 23 static-analysis bug findings. The five defect records include behavior and portability findings; they are not asserted to be the same population as SonarQube issues.

The `OK` quality gate is the server’s result for its configured gate and does not mean that all 23 bug findings, 17 security hotspots, or 954 code smells have been addressed. The 17 hotspots now have a separate local source assessment, but SonarQube still records zero reviewed hotspots because no server review statuses were changed. Hotspots are not counted as vulnerabilities.

## Findings and proposed improvements

1. **Triage and correct the reported bugs.** SonarQube reported 23 bugs. Two major `javascript:S6638` findings identify a redundant nullish fallback after a numeric multiplication in `CustomerOrdersModal.jsx` and `CustomerSupplyOrdersModal.jsx`; a critical `javascript:S930` finding reports an incorrect argument count in `FarmerProductManager.jsx`. Reproduce the affected UI paths, correct the expression or call, and add focused tests before marking each finding resolved.
2. **Reduce complexity in basket calculations.** `javascript:S3776` reports cognitive complexity 34 and 35 for the two calculation handlers in `backend/routes/cartRoutes.js` (the rule threshold is 15); the authentication route also exceeds the threshold at 16. In a separate, test-backed improvement, extract validation and line-total calculation into small functions while preserving API response shape.
3. **Raise tested coverage and complete the hotspot workflow.** SonarQube aggregate coverage is 25.0%; the successful scan imported 31.93% backend-only `c8` statement/line coverage. A later final backend run measured 31.96% statements/lines, 59.25% branches, and 17.39% functions, but its LCOV report was not imported. Frontend modules did not receive execution coverage. Add focused frontend and untested backend behavior tests. The 17 hotspots now have local individual assessments, including order-data access-control risks; the SonarQube workflow still needs an authorized user to apply and record review dispositions.

## Limitations

- The scan completed, but SonarQube logged missing SCM blame information for modified/untracked files because they had not been committed. This may limit history-dependent features; it did not prevent issue or metric collection.
- The scanner logged that the installed `baseline-browser-mapping` dataset was more than two months old. It did not prevent analysis. No package update was made because dependency maintenance is outside this assignment’s implementation scope.
- The analysis is static and is not a penetration test. The zero vulnerability count is limited to the rules and source scope scanned.
- A later final c8 run followed a small cart-validation correction that preserves the existing omitted-quantity default. An attempt to upload a fresh analysis without a project-analysis token was rejected by SonarQube; no token was requested or added. The successful scan metrics above remain the actual metrics from the prior authenticated analysis, and the final c8 measurement is reported separately.
- The temporary SonarQube administrator password from the original setup was not retained. The anonymous read-only configuration used to retrieve hotspot details was restored, and the service is stopped. An authorized local SonarQube administrator must log in (or reset local access) to apply the official hotspot review statuses or upload a later scan.
- The local dashboard service was stopped after evidence collection and its original authentication configuration was restored. The machine’s Docker Linux engine was unavailable and WSL had only the Docker Desktop distribution, so Linux startup was not tested.

## Evidence

- [`evidence/sonarqube-analysis/sonarqube-results.json`](evidence/sonarqube-analysis/sonarqube-results.json) — captured metrics, quality gate, issue sample, and derived defect density.
- [`evidence/sonarqube-analysis/security-hotspots.json`](evidence/sonarqube-analysis/security-hotspots.json) — sanitized actual detail for all 17 hotspots and original SonarQube statuses.
- [`hotspot-review.md`](hotspot-review.md) — individual source-based assessment and recommendations for all hotspots.
- [`evidence/screenshots/sonarqube-dashboard.png`](evidence/screenshots/sonarqube-dashboard.png) and [`evidence/screenshots/sonarqube-hotspots.png`](evidence/screenshots/sonarqube-hotspots.png) — genuine local browser captures.
- [`evidence/sonarqube-analysis/final-verification/stdout.txt`](evidence/sonarqube-analysis/final-verification/stdout.txt) — actual outcome of the unauthenticated rescan attempt (rejected; prior successful scan remains the reported Sonar analysis).
- [`evidence/sonarqube-analysis/execution.json`](evidence/sonarqube-analysis/execution.json) — scanner command, timestamps, exit code, and source fingerprints.
- [`evidence/sonarqube-analysis/stdout.txt`](evidence/sonarqube-analysis/stdout.txt) and [`stderr.txt`](evidence/sonarqube-analysis/stderr.txt) — actual scanner output.
- [`evidence/coverage/lcov.info`](evidence/coverage/lcov.info) — generated backend LCOV report imported by SonarQube.
- [`evidence/coverage/lcov-report/index.html`](evidence/coverage/lcov-report/index.html) — generated HTML coverage summary.
- [`../section-3.8/evidence/post-fix-regression/stdout.txt`](../section-3.8/evidence/post-fix-regression/stdout.txt) — actual c8 and regression output.
