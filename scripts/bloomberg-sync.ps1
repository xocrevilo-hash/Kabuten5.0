# Kabuten 5.0 — Bloomberg Sync Launcher
# Run this via Windows Task Scheduler (weekly, while Bloomberg Terminal is open)
# -----------------------------------------------------------------------
# SETUP: Edit the DATABASE_URL below with your Neon Postgres connection string
# -----------------------------------------------------------------------

$env:DATABASE_URL = "postgresql://neondb_owner:npg_Nrx0h7CWGIAS@ep-damp-fog-aiulq9qw-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "Starting Kabuten Bloomberg Sync — $(Get-Date)"
& python "\\Mac\Home\Desktop\Kabuten5.0 20.29.52\scripts\bloomberg-sync.py" 2>&1 | Tee-Object -FilePath "\\Mac\Home\Desktop\Kabuten5.0 20.29.52\scripts\bloomberg-sync.log" -Append
Write-Host "Done — $(Get-Date)"
