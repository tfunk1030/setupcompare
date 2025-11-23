# SetupComparer

SetupComparer is a full-stack web application for iRacing drivers to upload two setup files, compare them side-by-side, and receive human-friendly insights on how changes will affect on-track behaviour.

## Features
- Upload two iRacing `.sto` setup files and automatically parse sections such as suspension, aero, ride height, tyres, alignment, differential, brakes, fuel, and drivetrain.
- Comparison engine shows old value → new value → delta with colour-coded significance.
- Interpretation engine with 20+ rules to describe likely handling changes, plus profile-aware hints for car model and track category.
- Setup Effect Analysis workflow that stores each setup, links comparisons to setup IDs, and hydrates deltas/summary from the database for history and sharing.
- User accounts with JWT authentication, comparison history, and shareable public links (login required to upload setups or save comparisons).
- Export comparison results to CSV or PDF with commentary.
- Optional telemetry upload (.ibt or CSV) to overlay tyre temps, lap times, and wheel speeds alongside setup deltas.
- Modern stack: React + TypeScript frontend, Express + TypeScript backend, SQLite persistence.

## Project structure
```
/src
  /backend   # API, parsing, comparison logic
  /frontend  # React app
  /shared    # TypeScript contracts
/docs        # API and deployment guides
/scripts     # automation hooks
```

## Getting started
1. Install dependencies: `npm install`
2. Run backend: `npm run dev:backend`
3. Run frontend dev server: `npm run dev:frontend`
4. Run unit tests (comparison/rule/summary engines): `npm test`

Environment variables:
- `PORT` (default 4000)
- `DB_PATH` location for SQLite file
- `JWT_SECRET` token signing secret

## API
See [docs/API.md](docs/API.md) for endpoint details.

### Setup Effect Analysis endpoint
- `POST /api/comparisons/analyseSetupEffects` (auth required)
  - Accepts `setupA`/`setupB` files (multipart), raw JSON payloads, or existing `setupA_id`/`setupB_id` references.
  - Optional metadata: `carModel`, `trackName`, `trackCategory`.
  - Returns stored comparison record with `deltas`, `summary`, `baseline`, `candidate`, and setup IDs for hydration.

### Severity thresholds
- The comparison engine classifies minor/moderate/major severities using default thresholds defined in `src/shared/comparisonEngine.ts`.
- Override by passing a custom threshold object when invoking the engine (or extend the route to accept overrides).
- Each `ParameterDelta` now carries a `severity` payload plus `missingSide` metadata when a parameter exists in only one setup.

### Rule database and maintenance
- Rule definitions with context tags live in `src/shared/rules/defaultRules.json`.
- Each rule lists `keyIncludes`, optional `contexts` (`carModel`, `trackCategory`), and `shortTemplate`/`fullTemplate` strings.
- To add or edit rules: update the JSON entry, ensuring keys match setup parameter identifiers; no code changes are required unless adding new context fields.

### Setup Effect Analysis UX
- The Comparison page now provides a “New Comparison” uploader, per-parameter explanation toggles, and a combined "What This Means On Track" summary with short/full modes.
- Combined summaries highlight overall effect, balance, interactions, and recommendations.

## Deployment
Container-friendly configuration with build scripts described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Persist the SQLite volume when deploying.
