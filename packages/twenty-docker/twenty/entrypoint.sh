#!/bin/sh
set -e

setup_and_migrate_db() {
    if [ "${DISABLE_DB_MIGRATIONS}" = "true" ]; then
        echo "Database setup and migrations are disabled, skipping..."
        return
    fi

    echo "Running database setup and migrations..."

    # Run setup and migration scripts
    has_schema=$(psql -X -v ON_ERROR_STOP=1 -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core')" "${PG_DATABASE_URL}")
    if [ "$has_schema" = "f" ]; then
        echo "Database appears to be empty, running migrations."
        yarn database:init:prod
    elif [ "$has_schema" = "t" ]; then
        # A failed first initialization can leave an empty core schema behind.
        # Never treat that as an initialized database or attempt destructive repair.
        has_workspace=$(psql -X -v ON_ERROR_STOP=1 -tAc "SELECT to_regclass('core.workspace') IS NOT NULL" "${PG_DATABASE_URL}")
        if [ "$has_workspace" != "t" ]; then
            echo "Error: core schema exists without core.workspace; initialization is incomplete. Restore or complete initialization under operator review." >&2
            exit 1
        fi
    else
        echo "Error: Could not determine database initialization state." >&2
        exit 1
    fi

    # A workspace table can survive a later failed legacy migration. Validate
    # the full frozen migration ledger without attempting automatic repair.
    node dist/database/scripts/check-db-initialization.js

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache before upgrade, but continuing startup..."
    fi

    if ! yarn command:prod upgrade; then
        echo "Error: Database upgrade failed; refusing to start the application. Check migration logs before retrying." >&2
        exit 1
    fi

    if ! yarn command:prod cache:flush; then
        echo "Warning: Failed to flush cache after upgrade, but continuing startup..."
    fi

    echo "Successfully migrated DB!"
}

register_background_jobs() {
    if [ "${DISABLE_CRON_JOBS_REGISTRATION}" = "true" ]; then
        echo "Cron job registration is disabled, skipping..."
        return
    fi

    echo "Registering background sync jobs..."
    if yarn command:prod cron:register:all; then
        echo "Successfully registered all background sync jobs!"
    else
        echo "Warning: Failed to register background jobs, but continuing startup..."
    fi
}

setup_and_migrate_db
register_background_jobs

# Continue with the original Docker command
exec "$@"
