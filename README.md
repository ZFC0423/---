# Ganzhou Travel Platform

This repository contains the graduation project workspace for:

`Design and Implementation of a Ganzhou Travel and Culture Smart Service Platform`

## Current Scope

The repository currently includes:

- `client-web/` for the public website
- `admin-web/` for the admin console
- `server/` for the Node.js backend
- `sql/` for MySQL initialization scripts
- `docs/` for project documentation

## Current Backend Status

The backend already has:

- Express startup entry
- environment variable loading
- Sequelize database connection
- unified response helpers
- JWT auth middleware
- upload endpoint with local `/uploads` static access
- first batch of front/admin APIs

## Database Name

Use the same database name everywhere:

- `ganzhou_travel_platform`

## Initialization

Prerequisites:

- MySQL 8.x
- Node.js 18+ and npm

1. Import [sql/schema.sql](C:\Users\Administrator\Desktop\ganzhou-travel-platform\sql\schema.sql)
2. Copy `server/.env.example` to `server/.env`
3. Update database credentials in `server/.env`
4. Install dependencies in `server`
5. Start the backend with `npm run dev`

## Default Admin Account

- username: `admin`
- password: `Admin@123456`
