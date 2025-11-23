# Deployment Guide

## Environment variables
- `PORT` (default `4000`)
- `DB_PATH` path to SQLite database file
- `JWT_SECRET` secret for signing JWT tokens

## Development
```bash
npm install
npm run dev:backend
npm run dev:frontend
```

## Production build
```bash
npm run build
npm start
```

## Docker
```
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/backend/server.js"]
```

## Hosting
- **Self-host**: Run the container on any VM with Node 18+.
- **Cloud (Render/Fly.io/Heroku alternative)**: Configure environment variables, persist the SQLite volume, and expose port 4000.
- **Static frontend**: Serve `dist/frontend` via CDN or reverse proxy pointing `/api` to the Express server.
