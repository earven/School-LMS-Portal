<#
.SYNOPSIS
  Quick‑preview helper for the School‑LMS‑Portal.
  Installs dependencies (if needed), builds the app, and launches the Vite dev server.
  All actions run on your machine; no agent token usage.
#>

# Change to project root – adjust if you move the script elsewhere
Set-Location "D:\coding_files\School-LMS-Portal"

Write-Host "=== Installing NPM dependencies (if any) ==="
npm install

Write-Host "`n=== Building production bundle (optional) ==="
npm run build

Write-Host "`n=== Starting Vite development server ==="
npm run dev   # This will keep the console occupied until you press Ctrl+C
