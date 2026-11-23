# Unstop E2E Test Lab

A local React/Vite dashboard with an Express runner API for exactly 12 Cypress E2E cases against Unstop's public website. The suite does not sign in, register, submit applications, book sessions, or change account data.

## Features

- Launch the full Cypress suite in headed Chrome or run it headlessly.
- Stream per-test results to the dashboard and review previous run summaries.
- Generate HTML and JSON reports for each run.
- Configure local API and dashboard ports without changing source code.

## Technology stack

- React 19 and Vite 6 for the dashboard.
- Node.js and Express 5 for the local runner API.
- Cypress 14 for browser-based end-to-end testing.

## Requirements

- Node.js LTS with npm.
- Google Chrome for headed Cypress runs.
- Internet access to install dependencies and load the public Unstop website.

## Installation and run

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), then click **Launch Cypress**. This starts the full E2E suite automatically in headed Chrome; no Cypress picker or manual spec selection is involved. The dashboard streams per-test results and offers a separate **Run headless** action.

### Quick start on Windows

After copying or extracting the project folder onto a Windows PC, install Node.js LTS (including npm) and Google Chrome. Double-click **Quick Start.bat** in the project folder. It installs npm dependencies if they are missing, starts the dashboard/API in a separate terminal window, and opens the dashboard in your browser. Leave the server terminal open while using the dashboard. Click **Launch Cypress** to run the suite. The first dependency install needs an internet connection. To stop the app, press Ctrl+C in the server terminal or close that terminal window.

The batch file does not include Node.js, Chrome, or `node_modules`; each PC needs Node.js and Chrome installed, and dependencies are installed locally on first use. If ports 4174 or 5173 are already occupied, see the troubleshooting section below.

The API health endpoint is [http://localhost:4174/api/health](http://localhost:4174/api/health). Detailed HTML and JSON reports are written under `reports/runs/`. Cypress captures failure screenshots in `cypress/screenshots/` and run video in `cypress/videos/`.

## The 12 E2E scenarios

1. Loads the Unstop homepage and public visitor content.
2. Shows Unstop branding and primary navigation controls.
3. Navigates from the homepage to Hackathons.
4. Shows the hackathon listing and its search/filter controls.
5. Reads public hackathon card information and opens an opportunity.
6. Checks public hackathon details, including eligibility or timeline information.
7. Presents the registration call to action without submitting it.
8. Navigates to the public Internships section.
9. Shows internship opportunities and public listing controls.
10. Opens an internship and presents Quick Apply without submitting it.
11. Explores the public Mentorship landing page and mentor discovery.
12. Loads another public section with job listings.

The suite keeps one browser session across sequential journeys (`testIsolation: false`) and changes sections through public navigation where it is available. It navigates to a route only when the current page is not already in that section. Application, registration, and booking calls to action are inspected without being clicked. Tests use visible public content and avoid fixed event names, deadlines, and result counts.

After each case, the dashboard receives its result and Cypress pauses for three seconds before continuing, so an observer can see the current page and completed status. The final case has no extra pause.

## Configuration and troubleshooting

Default ports are API `4174` and dashboard `5173`. Optional non-secret overrides can be placed in `.env` using `.env.example` as a reference (`API_PORT`, `DASHBOARD_PORT`). Copy `.env.example` to `.env` to get started. Local `.env` files are excluded from Git; do not put credentials or API keys in the committed example. Vite uses strict port binding. If these ports are occupied and `/api/health` responds, the dashboard is already running; open it instead of starting a second copy. Otherwise, the server prints the occupied port. Stop the existing server with Ctrl+C in its terminal or choose unused ports; the app never kills unrelated processes or silently moves the dashboard.

### Available npm scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dashboard and runner API |
| `npm run build` | Create a production dashboard build in `dist/` |
| `npm run cypress:run` | Run Cypress in headed Chrome |
| `npm run cypress:headless` | Run Cypress in headless Chrome |

If PowerShell blocks the `npm` script shim, invoke `npm.cmd` instead (for example, `npm.cmd install`). Cypress needs a locally installed Chrome browser for headed launches. If Chrome is missing, install/update Chrome and relaunch. If Cypress reports `ELECTRON_RUN_AS_NODE` startup trouble, the API removes that variable from Cypress's child environment automatically.

To stop the app, focus the terminal running `npm run dev` and press **Ctrl+C**. Do not close the dashboard tab to stop the server.

The live site can change, require cookies/JavaScript, or block automated requests. The suite records real failures and does not bypass CAPTCHAs or access checks. Inspect the generated report and screenshots/video before changing assertions.
