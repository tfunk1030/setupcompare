# SetupComparer

SetupComparer is a full-stack web application for iRacing drivers to upload two setup files, compare them side-by-side, and receive human-friendly insights on how changes will affect on-track behaviour.

## Features
- Upload two iRacing `.sto` setup files and automatically parse sections such as suspension, aero, ride height, tyres, alignment, differential, brakes, fuel, and drivetrain.
- Comparison engine shows old value → new value → delta with colour-coded significance.
- Interpretation engine with 20+ rules to describe likely handling changes, plus profile-aware hints for car model and track category.
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

Environment variables:
- `PORT` (default 4000)
- `DB_PATH` location for SQLite file
- `JWT_SECRET` token signing secret

## API
See [docs/API.md](docs/API.md) for endpoint details.

## Deployment
Container-friendly configuration with build scripts described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Persist the SQLite volume when deploying.
