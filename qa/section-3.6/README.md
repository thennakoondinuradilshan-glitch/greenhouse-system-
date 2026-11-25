# EC4206 section 3.6 — Selenium and GitHub Actions

Eight Selenium cases exercise login validation, invalid and valid login, marketplace search, basket totals, customer registration, unauthorized access, and logout against the real frontend/backend and a dedicated MongoDB database.

The workflow `.github/workflows/selenium-tests.yml` runs on push, pull_request, and workflow_dispatch. It uses a health-checked MongoDB service, starts the real application, runs Chrome headlessly, fails on failed/blocked tests, and uploads screenshots and reports even after failure.

Local setup from the repository root:

```powershell
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
npm.cmd ci --prefix qa/section-3.6
powershell.exe -NoProfile -ExecutionPolicy Bypass -File qa/section-3.6/scripts/run-headed.ps1
```

Node.js 26.13.0, Chrome, and a local mongod executable are required. Set QA_MONGOD or QA_CHROME when the installed executable paths differ. Local MongoDB uses loopback port 27038; the frontend/backend use ports 3000/5001. Tests create synthetic data and random credentials in memory. Runtime files and dependencies are ignored.

The runner extends the existing Selenium page object in `backend/tests/ui/selenium_marketplace.test.js`. A simulator import filename-case correction is included so the actual server starts on Linux.

Reports and screenshots are under the workflow run's `smartgrow-selenium-<run-id>-<attempt>` artifact. Local and remote execution results must be distinguished; only an actual remote run establishes CI success.
