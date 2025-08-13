# Deployment Summary

- Backend now uses PostgreSQL directly via `pg` instead of Supabase client.
- Auth replaced with JWT (username-based login); token in Authorization: Bearer.
- Required env vars:
  - DATABASE_URL
  - JWT_SECRET
  - FRONTEND_URL
- Render config (`render.yaml`) already provisions a managed Postgres.
- Start commands unchanged: `cd server && npm run production`.