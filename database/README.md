# Database Setup

## Prerequisites
- Node.js installed
- No additional database software is required as we use SQLite, which is embedded in the application

## Setup Instructions

1. **Initialize the database**:
   SQLite database will be automatically created and initialized when the server starts for the first time. The database file (`wallet.db`) will be stored in the `server/data` directory.

2. **Manual initialization** (if needed):
   You can manually initialize the database by running the server, which will execute the SQL scripts from `database/sqlite_init.sql`.

3. **Database migrations**:
   Any schema changes are managed through migration scripts located in the `database/migrations` directory. Migrations are executed when the server starts.

## Environment Configuration

There are no specific database environment variables required for SQLite. The database path is hardcoded to `server/data/wallet.db`.

## Troubleshooting

- If you encounter issues with the database, check the `server/data` directory to ensure it has write permissions
- Make sure the `database/sqlite_init.sql` file exists and contains valid SQL
- For database reset, you can stop the server, delete the `wallet.db` file, and restart the server to recreate the database from scratch