# API Overview

Base URL: `/api`

## Auth
- `POST /auth/register` { email, password } → `{ token }`
- `POST /auth/login` { email, password } → `{ token }`

## Comparisons
- `POST /comparisons/upload` (multipart/form-data with two `files`) headers: `Authorization: Bearer <token>` → ComparisonRecord payload with deltas and shareId
- `GET /comparisons/history` headers: `Authorization: Bearer <token>` → array of past comparisons
- `GET /comparisons/shared/:shareId` → public view of shared comparison including parameter deltas

## Error model
`{ message: string, error?: string }`

Rate limited to 60 req/minute per IP.
