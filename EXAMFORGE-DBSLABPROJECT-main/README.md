# Online Multiple-Choice Test Management System

Single-workspace full-stack implementation using React + Vite + Express + PostgreSQL.

## Tech Stack

- Frontend: React (exact UI foundation extended from `master.txt`)
- Backend: Node.js + Express + JWT + RBAC
- Database: PostgreSQL (`schema.sql` with normalized schema + seed)

## Database Credentials

- Username: `postgres`
- Password: `password`
- Database: `test_mgmt_system`

## Setup

1. Ensure PostgreSQL is running and create DB:
	```sql
	CREATE DATABASE test_mgmt_system;
	```
2. Environment file already added as `.env` (same values as `.env.example`).
3. Install dependencies:
	```bash
	npm install
	```
4. Start backend:
	```bash
	npm run server
	```
5. Initialize schema + seed data (choose one):
	- Direct SQL:
	  ```bash
	  psql -U postgres -d test_mgmt_system -f schema.sql
	  ```
	- API init endpoint:
	  ```bash
	  curl -X POST http://localhost:4000/api/setup/init-db
	  ```
6. Start frontend (new terminal):
	```bash
	npm run dev
	```

## Demo Login Users

- Instructor: `instructor@test.com` / `password`
- Contributor: `contributor@test.com` / `password`
- Student: `student@test.com` / `password`

## Main API Endpoints

- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`
- Questions: `GET /api/questions`, `POST /api/questions`, `PATCH /api/questions/:id/status`
- Tests: `GET /api/tests`, `POST /api/tests`, `POST /api/tests/:id/generate`
- Attempts: `POST /api/tests/:id/start`, `GET /api/tests/:id/questions`, `POST /api/tests/:id/submit`
- Analytics: `GET /api/analytics/overview`, `GET /api/analytics/leaderboard`
- Results: `GET /api/results/me`

## Notes

- Randomized test generation is implemented in `POST /api/tests/:id/generate` with difficulty distribution.
- Automated scoring and ranking are computed in the submission transaction using joins and window functions.
- Indexes added on high-frequency filter columns including `topic`, `difficulty`, and status fields.
