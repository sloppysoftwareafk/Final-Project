# Insurance Policy Management System

Single-workspace full-stack implementation using React + Vite + Express + PostgreSQL.

## Tech Stack

- Frontend: React (Vite)
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
5. Initialize schema + seed data:
   ```bash
   psql -U postgres -d test_mgmt_system -f schema.sql
   ```
6. Start frontend (new terminal):
   ```bash
   npm run dev
   ```

## Demo Login Users

- Admin: `admin@insureflow.com` / `password`
- Agent: `agent@insureflow.com` / `password`
- Customer: `customer@insureflow.com` / `password`

## Domain Model (Insurance)

- Customers, agents, and admins are managed through role-based accounts.
- Policy plans and coverage options are reviewed/approved through workflow statuses.
- Policies are assembled from approved plans.
- Customers can file claims, submit claim responses, and view claim history.
- Analytics summarizes approval ratios, active policies, and customer performance.
