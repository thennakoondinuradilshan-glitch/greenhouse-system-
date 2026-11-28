# SmartGrow OS — Sections 3.8 and 3.9 Submission

This package contains the Section 3.8 defect-tracking work and Section 3.9 quality-metrics/SonarQube evidence. It does not replace or duplicate Sections 3.7 or 3.10.

## Requirements and contents

- Assignment report: `qa/EC4206_SmartGrow_Report_3.8_and_3.9.md`
- Five copy-ready defect drafts and manual browser checklist: `GITHUB_ISSUES.md`
- Defect register, two root-cause analyses, and local lifecycle: `qa/section-3.8/defect-tracking.md`
- Baseline and final real-backend execution reports/logs: `qa/section-3.8/evidence/baseline/` and `qa/section-3.8/evidence/final-verification/`
- Previous successful post-fix run: `qa/section-3.8/evidence/post-fix-regression/`
- SonarQube metrics and scan output: `qa/section-3.9/evidence/sonarqube-analysis/`
- Individual local assessments for all 17 hotspots: `qa/section-3.9/hotspot-review.md`
- Actual screenshots: `qa/section-3.9/evidence/screenshots/`
- Relevant application fixes: backend auth, cart and device routes; backend startup import; frontend device API helpers.

## Run the regression suite (Windows PowerShell)

Prerequisites: Node.js, npm dependencies installed for `backend`, `frontend`, and `qa`, and a local MongoDB `mongod.exe`. The test uses an isolated MongoDB data directory and loopback ports 27028/5001; it refuses to reuse occupied ports. It creates synthetic data and does not connect to production databases or physical actuators.

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
npm.cmd ci --prefix qa
$env:QA_MONGOD = 'C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe'
$env:QA_EVIDENCE_DIR = 'qa\section-3.8\evidence\local-run'
node --test --test-reporter=tap qa\section-3.8\tests\application.test.cjs
Remove-Item Env:QA_EVIDENCE_DIR
```

To collect backend coverage as well:

```powershell
node qa\node_modules\c8\bin\c8.js --all --include "backend/**/*.js" --reporter=lcov --reporter=text-summary --reports-dir qa\section-3.9\evidence\coverage-run node --test --test-reporter=tap qa\section-3.8\tests\application.test.cjs
```

Build the frontend:

```powershell
npm.cmd --prefix frontend run build
```

The tested final backend regression result was **10/10 passed**. The frontend production build passed with a non-fatal Vite warning that the minified JavaScript chunk exceeds 500 kB.

## Repeat SonarQube analysis

The recorded successful scan used SonarQube Server 26.1.0.118079 and the `@sonar/scan` package. For a new scan, start a local SonarQube service bound to `127.0.0.1`, configure a local analysis token through its UI, and use the repository's `sonar-project.properties`:

```powershell
$env:SONAR_HOST_URL = 'http://127.0.0.1:9000'
$env:SONAR_TOKEN = '<locally generated SonarQube token>'
node qa\node_modules\@sonar\scan\bin\sonar-scanner.js
Remove-Item Env:SONAR_TOKEN
Remove-Item Env:SONAR_HOST_URL
```

Do not put the token in this package, a source file, or a committed environment file. A later anonymous scan attempt was correctly rejected because it had no project-analysis permission; its exact output is retained under `qa/section-3.9/evidence/sonarqube-analysis/final-verification/`. The temporary admin password from the original local setup was not retained, so an authorized administrator must restore access before applying the official hotspot dispositions or uploading a later scan. The packaged successful metrics remain those from the completed authenticated scan, and this limitation is described in the report.

## Known limitations and manual actions

- The successful SonarQube scan reports 17 hotspots. All 17 were individually assessed in `hotspot-review.md`, but the server's review statuses were not changed and its metric remains 0% reviewed.
- The prior SonarQube administrator password was not retained; use an authorized administrator account or reset local access before changing hotspot statuses or rerunning the analysis.
- Docker's Linux engine was unavailable and WSL had only the Docker Desktop distribution. Linux startup therefore was not executed; the simulator filename portability check is static.
- The public GitHub Issues page showed a sign-in prompt and 0 open / 0 closed issues. No issue was created. Sign in through the browser, create/update the five drafts, record real issue URLs and numbers, and close only after maintainer acceptance. The remote GitHub lifecycle is pending.
- SonarQube's aggregate coverage was 25.0% for the completed scan. The latest separate backend c8 run measured 31.96% statements/lines, 59.25% branches, and 17.39% functions; this later c8 result was not uploaded to SonarQube because analysis permission was unavailable.
