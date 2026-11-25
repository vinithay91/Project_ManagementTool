# CodeAlpha Task 3 — Project Management Tool

A Trello-style collaborative project management app built with:
- React + Vite
- Node.js + Express
- MySQL
- JWT authentication
- bcrypt password hashing

## Features
- Register and log in with email/password
- Passwords stored as bcrypt hashes (never plaintext)
- Create project workspaces and invite/add registered members by email
- Project board with task cards and status columns (To Do, In Progress, Done)
- Create, edit, delete and assign tasks
- Task comments
- Project member list
- Responsive interface

## Prerequisites
Install Node.js (LTS), MySQL Server, and a MySQL client such as MySQL Workbench.

## 1. Set up MySQL
Open MySQL Workbench and run `database/schema.sql`.

## 2. Configure backend
Open a terminal:
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` and update the MySQL credentials and JWT secret:
```bash
# Windows PowerShell
Copy-Item .env.example .env
```
Then start the API:
```bash
npm run dev
```
API runs at http://localhost:5000

## 3. Configure frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Demo flow
1. Register two accounts using different email addresses.
2. Log in with the first account and create a project.
3. Add the second account as a member using their registered email.
4. Create a task and assign it to the second member.
5. Open the task to add comments and change its status.

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/members`
- `GET/POST /api/projects/:id/tasks`
- `PATCH/DELETE /api/tasks/:id`
- `GET/POST /api/tasks/:id/comments`

All project/task/comment routes require `Authorization: Bearer <token>`.

## Notes
- This is an internship/demo starter project. For production, add email verification, password reset, rate limiting, audit logs, and stronger deployment configuration.
