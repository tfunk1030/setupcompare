Create a full-stack web application named SetupComparer for sim-racing users of iRacing. The core functionality is:

Allow the user to upload two car-setup files exported from iRacing.

Automatically parse each setup file to extract all setup parameters (suspension, aero, ride height, tyre pressures, camber, toe, anti-roll bars, etc).

Present a side-by-side comparison of the two setups: display each parameter’s old value, new value, and delta; highlight major changes visually (e.g., colour coding).

Include a human-friendly interpretation engine: for each significant parameter change produce a text explanation of what that change will likely do on track (e.g., “increasing front ride height by 3 mm → less front downforce → likely under-steer on turn-in”).

Provide user accounts so each user can save past comparisons, view comparison history, export reports, and optionally generate a shareable public link.

Use a modern tech stack: React + TypeScript for the front end, Node.js + Express + SQLite (or other lightweight DB) for the backend, REST API endpoints, responsive UI (desktop + tablet).

In the UI, after file upload and parsing, show: a dashboard with past comparisons, a new-comparison flow, the detailed comparison view, and the interpretation panel.

Provide export functionality (PDF or CSV) of comparison results with parameter differences and human insight commentary.

Architect the app so it can later support advanced features: telemetry upload (e.g., .ibt files), car/track-specific rule variations, and deeper analytics.

Include deployment configuration: environment variables, build scripts, and instructions to deploy on a cloud platform or self-host.

Please scaffold project structure (folders, key files), implement parsing of setup files, build the comparison engine, create the UI for file uploads and results display, and stub out the interpretation engine with at least 20 mapping rules for common setup parameters.”
