# Database Init Guide

The project uses the MySQL database name:

- `ganzhou_travel_platform`

Initialization script:

- [sql/schema.sql](C:\Users\Administrator\Desktop\ganzhou-travel-platform\sql\schema.sql)

## Prerequisites

1. MySQL 8.x is recommended.
2. The MySQL service must already be running.
3. The local account used by the server must have permission to create and use the database.

## Import Command

From the repository root:

```bash
mysql -u root -p < sql/schema.sql
```

If you prefer to import inside the MySQL client:

```sql
source C:/Users/Administrator/Desktop/ganzhou-travel-platform/sql/schema.sql;
```

## What The Script Creates

The script creates:

- database `ganzhou_travel_platform`
- all required tables
- indexes for common query fields
- one admin account
- categories
- 6 scenic records
- 6 article records
- 2 banner records
- home recommendation data
- system config data

## Default Admin Account

- username: `admin`
- password: `Admin@123456`

The password stored in the database is encrypted and matches the current server login verification logic.
