# SmartGrow OS Agile and DevOps Reflection

## 3.10 Agile and DevOps Reflection

The workbook gives our four-person group a shared baseline for test cases and expected behaviour. During a sprint, we can translate a requirement into acceptance criteria before implementation and use the existing basket and pump BDD scenarios as examples. When a defect is discovered, one person can implement the fix and another can verify it against the original expected result. Linking the test case, issue, change, and verification output makes that handoff traceable.

GitHub Actions already provides feedback on the backend suites and frontend build. The fixture-to-application mismatch showed that a passing pipeline can still leave an important workflow unchecked. We would add a small check against the real Express route and run an executable Selenium smoke test before treating browser automation as part of the definition of done. We would review SonarQube findings in the next sprint and keep repeatable JMeter runs as evidence for releases that affect API performance.
