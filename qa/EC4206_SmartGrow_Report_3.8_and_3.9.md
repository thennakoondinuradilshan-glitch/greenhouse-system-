# SmartGrow OS — EC4206 Sections 3.8 and 3.9

## 1. Scope and source requirements

This report covers only **3.8 Defect Tracking (LO-2, LO-4)** and **3.9 Quality Metrics & SonarQube (LO-4)** from the original `EC4206_Group_Assignment_Task_List.docx`. Their deliverables are:

- **3.8:** Log bugs found during testing in Jira, Bugzilla, or GitHub Issues; perform root-cause analysis on one or two significant bugs; document the full New → Assigned → Fixed → Verified → Closed lifecycle for at least one.
- **3.9:** Run SonarQube against the codebase; report code coverage, defect density, code smells, and technical debt; propose two or three concrete improvements based on the findings.

The group report supplied for Sections 3.7 and 3.10 was reviewed for style and boundaries only. Those sections and their evidence were not modified or duplicated.

## 2. Test and defect methodology

The existing QA suite was reused and extended rather than replaced. It starts the actual SmartGrow Express server and a separate local MongoDB process, then exercises the actual API routes and models over HTTP. Each run uses a unique database name and local data directory, binds to loopback, and creates synthetic accounts and products. The suite refuses to reuse an occupied test port. It does not connect to a production/remote database or physical greenhouse, and it does not operate real actuators.

The baseline evidence was preserved before further work. It records five passing tests and five failing tests. The five failures reproduced the five defect IDs SG-001 to SG-005. Fixes were reviewed in place and the existing actual-backend suite was rerun; focused assertions cover duplicate normalized email, invalid fallback crop/supply quantities and prices, valid calculations, and preservation of the omitted-quantity default.

## 3. Section 3.8 — Defect Tracking

Five baseline defects were documented with reproduction steps, expected and actual behavior, severity/priority, root cause, fix, and post-fix evidence in [`GITHUB_ISSUES.md`](../GITHUB_ISSUES.md). The local register and detailed root-cause analyses are in [`section-3.8/defect-tracking.md`](section-3.8/defect-tracking.md).

| ID | Reproduced defect | Fix and verification |
|---|---|---|
| SG-001 | Public registration accepted `role=admin` (HTTP 201). | Public admin registration now returns HTTP 400; test passed. |
| SG-002 | Mixed-case/space-padded login email returned HTTP 400; duplicate lookup did not normalize input. | Registration and login use trimmed lowercase email; login returns HTTP 200 and duplicate registration returns HTTP 400. |
| SG-003 | Anonymous device creation returned HTTP 201. | Create/update/delete require authentication and farmer/admin authorization; anonymous gets HTTP 401 and customer gets HTTP 403. |
| SG-004 | Negative fallback crop quantity produced a total of `-$12.50`. | Crop and supply basket validation rejects invalid quantities and fallback prices; omitted quantities still default to one; valid supply calculation remains `$13.50`. |
| SG-005 | Import `sensorSimulator.js` differed in case from tracked `sensorsimulator.js`. | Import now matches the exact filename and the static assertion passes. Linux startup remains unverified. |

SG-001 and SG-004 receive full root-cause analyses. SG-001 also has a documented local New → Assigned → Fixed → Verified → Closed lifecycle. **No GitHub Issue was created or updated.** The local status is resolved, while the actual GitHub lifecycle is not started and remains for manual completion. No issue number, URL, assigned label, or remote status is claimed.

### Baseline versus post-fix execution

| Execution | Tests | Passed | Failed | Exit code |
|---|---:|---:|---:|---:|
| Preserved baseline | 10 | 5 | 5 | 1 |
| Post-fix actual-backend run | 10 | 10 | 0 | 0 |

The final suite includes five application behavior checks and five defect-focused checks. The device test verifies allowed and denied roles and mutation methods. Basket tests verify invalid quantities/prices, valid calculations, and omitted-quantity defaults. The final test-ID matrix and actual outputs are in [`section-3.8/evidence/final-verification/FINAL_VERIFICATION_REPORT.md`](section-3.8/evidence/final-verification/FINAL_VERIFICATION_REPORT.md); preserved baseline and original post-fix evidence remain in their respective folders.

The baseline frontend production build passed, and the post-fix frontend production build was rerun successfully. Vite emitted a chunk-size warning for a 792.37 kB minified JavaScript chunk; this did not fail the build.

## 4. Section 3.9 — Quality Metrics & SonarQube

The local SonarQube Server `26.1.0.118079` completed an actual analysis of `backend` and `frontend/src`, excluding dependencies, generated build output, tests, and QA evidence. A `c8` LCOV report generated from the real-backend regression execution was imported. SonarQube reported an **OK** quality gate. This is the recorded pre-final compatibility-correction snapshot; the later anonymous rescan attempt was rejected for lack of project-analysis permission, so no newer Sonar metrics are claimed.

| Metric | Result |
|---|---:|
| SonarQube aggregate coverage | 25.0% |
| Backend-only c8 statement/line coverage imported into SonarQube | 31.93% |
| Latest separate backend c8 statement/line, branch, and function coverage | 31.96%, 59.25%, 17.39% |
| Reproduced-defect density | 0.20 defects/KLOC |
| Code smells | 954 |
| Bugs / vulnerabilities | 23 / 0 |
| Security hotspots / reviewed | 17 / 0% |
| Duplicated lines density | 4.5% |
| Technical debt / debt ratio | 5,373 minutes (89.55 hours) / 0.7% |
| Quality gate | OK |

Defect density is a derived metric: five defects actually reproduced in the baseline divided by 24,424 analyzed non-comment source lines (`5 / 24.424 KLOC = 0.2047`). It is not SonarQube’s 23 bug findings. The aggregate Sonar coverage includes frontend source; c8’s 31.93% covers backend JavaScript only for the imported scan. The latest c8 result is reported separately. The 17 hotspots have individual local source assessments in [`section-3.9/hotspot-review.md`](section-3.9/hotspot-review.md); SonarQube itself still records all 17 as `TO_REVIEW` and 0% reviewed.

Three evidence-based improvements are proposed: investigate the Sonar-reported incorrect nullish fallbacks and argument count, reduce the high cognitive complexity in basket calculations while preserving tested API behavior, and raise frontend/backend execution coverage while applying the reviewed hotspot dispositions in SonarQube. The latest backend c8 measurements are reported separately because the anonymous follow-up scan had no analysis permission. Details and scanner limitations are in [`section-3.9/sonarqube-report.md`](section-3.9/sonarqube-report.md).

## 5. Requirements-to-evidence map

| Requirement | Evidence |
|---|---|
| 3.8: Track defects found during testing | [`GITHUB_ISSUES.md`](../GITHUB_ISSUES.md); no remote issues claimed |
| 3.8: Root-cause analysis of 1–2 significant defects | SG-001 and SG-004 in [`section-3.8/defect-tracking.md`](section-3.8/defect-tracking.md) |
| 3.8: Full lifecycle for at least one defect | SG-001 local lifecycle in [`section-3.8/defect-tracking.md`](section-3.8/defect-tracking.md) |
| 3.9: Run SonarQube | [`section-3.9/evidence/sonarqube-analysis/`](section-3.9/evidence/sonarqube-analysis/) |
| 3.9: Report coverage, defect density, code smells, technical debt | Metrics and definitions in [`section-3.9/sonarqube-report.md`](section-3.9/sonarqube-report.md) |
| 3.9: Propose 2–3 improvements from findings | Three proposals in [`section-3.9/sonarqube-report.md`](section-3.9/sonarqube-report.md) |
| Actual regression execution and build evidence | [`section-3.8/evidence/`](section-3.8/evidence/) |
| Individual assessment of all 17 hotspots | [`section-3.9/hotspot-review.md`](section-3.9/hotspot-review.md), supported by the actual records in [`section-3.9/evidence/sonarqube-analysis/security-hotspots.json`](section-3.9/evidence/sonarqube-analysis/security-hotspots.json) |
| Genuine evidence screenshots | [`section-3.9/evidence/screenshots/`](section-3.9/evidence/screenshots/) |

## 6. Limitations and conclusion

The baseline and final post-fix backend execution, frontend build, static analysis, and earlier coverage import were performed locally and produced recorded outputs. The final backend coverage result is separate from the prior Sonar import because SonarQube rejected an anonymous follow-up analysis. The prior temporary SonarQube administrator password was not retained; an authorized local administrator must restore access to update official hotspot statuses. The simulator filename check is static only: Docker’s Linux engine was unavailable, and WSL had no general-purpose Linux distribution. No Linux startup result is claimed. The public GitHub Issues listing required sign-in and showed zero open/closed issues, so no remote lifecycle was started.

All five reproduced defects are fixed and pass the final local checks. The assignment’s local defect register, two root-cause analyses, and local SG-001 lifecycle are documented. The 17 hotspot source assessments are complete locally, but official SonarQube review-status updates and GitHub issue creation/closure remain manual actions. The final package is `EC4206_SmartGrow_Final_Submission_3.8_and_3.9.zip`; it contains relevant source changes, tests, reports, configuration, and genuine local evidence while excluding downloaded SonarQube binaries, dependency directories, and credentials.
