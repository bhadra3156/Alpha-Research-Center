# =============================================================
# AlphaResearch — Minimalist Theme Installer (Vercel deploy)
# File: deploy-minimalist-theme.ps1
#
# Run from your project root:
#   C:\Websites Project\Alpha Research Center
#
# What it does:
#   1. Auto-detects your frontend/ subfolder
#   2. Backs up existing globals.css + tailwind.config.ts
#   3. Installs the new minimalist files
#   4. Commits + pushes to GitHub
#   5. Vercel auto-deploys from main branch
#
# No localhost. No npm run dev. Just ship.
# =============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AlphaResearch  Minimalist Theme  Vercel Deploy" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# --- 0. Sanity: must be in project root, must be a git repo ---
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: This folder is not a git repository." -ForegroundColor Red
    Write-Host "       Run this from: C:\Websites Project\Alpha Research Center" -ForegroundColor Yellow
    exit 1
}

# --- 1. Locate globals.css + tailwind.config (handles frontend/) ---
$globalsPath  = $null
$tailwindPath = $null

$candidatesGlobals = @(
    "frontend\app\globals.css",
    "frontend\src\app\globals.css",
    "frontend\styles\globals.css",
    "app\globals.css",
    "src\app\globals.css",
    "styles\globals.css"
)
foreach ($p in $candidatesGlobals) {
    if (Test-Path $p) { $globalsPath = $p; break }
}

$candidatesTailwind = @(
    "frontend\tailwind.config.ts",
    "frontend\tailwind.config.js",
    "frontend\tailwind.config.mjs",
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.mjs"
)
foreach ($p in $candidatesTailwind) {
    if (Test-Path $p) { $tailwindPath = $p; break }
}

if (-not $globalsPath) {
    Write-Host "ERROR: Could not find globals.css anywhere in project." -ForegroundColor Red
    Write-Host "       Searched: frontend\app, frontend\src\app, app, src\app, styles" -ForegroundColor Yellow
    exit 1
}
if (-not $tailwindPath) {
    Write-Host "ERROR: Could not find tailwind.config anywhere in project." -ForegroundColor Red
    exit 1
}

Write-Host "Found globals  -> $globalsPath" -ForegroundColor Green
Write-Host "Found tailwind -> $tailwindPath" -ForegroundColor Green
Write-Host ""

# --- 2. Verify the new files exist in current dir -------------
if (-not (Test-Path ".\globals.css")) {
    Write-Host "ERROR: globals.css (new) not found in $(Get-Location)" -ForegroundColor Red
    Write-Host "       Copy the downloaded globals.css into this folder first." -ForegroundColor Yellow
    exit 1
}
if (-not (Test-Path ".\tailwind.config.ts")) {
    Write-Host "ERROR: tailwind.config.ts (new) not found in $(Get-Location)" -ForegroundColor Red
    Write-Host "       Copy the downloaded tailwind.config.ts into this folder first." -ForegroundColor Yellow
    exit 1
}

# --- 3. Backup ------------------------------------------------
$stamp     = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = ".theme-backup-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Copy-Item $globalsPath  "$backupDir\globals.css.bak"          -Force
Copy-Item $tailwindPath "$backupDir\$(Split-Path $tailwindPath -Leaf).bak" -Force

Write-Host "Backed up to    -> $backupDir\" -ForegroundColor Yellow
Write-Host ""

# --- 4. Install -----------------------------------------------
Copy-Item ".\globals.css"        $globalsPath  -Force
Copy-Item ".\tailwind.config.ts" $tailwindPath -Force

Write-Host "Installed new minimalist theme files." -ForegroundColor Green
Write-Host ""

# --- 5. Show diff summary -------------------------------------
Write-Host "Git status:" -ForegroundColor Cyan
git status --short
Write-Host ""

# --- 6. Commit + push -----------------------------------------
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "On branch: $branch" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Commit and push to GitHub? Vercel will auto-deploy. (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Aborted. Files are installed locally but NOT pushed." -ForegroundColor Yellow
    Write-Host "To push later: git add -A; git commit -m 'feat(ui): minimalist theme'; git push" -ForegroundColor Gray
    exit 0
}

git add $globalsPath
git add $tailwindPath
git commit -m "feat(ui): institutional minimalist theme - flat surfaces, unified palette"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git commit failed." -ForegroundColor Red
    exit 1
}

git push origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git push failed." -ForegroundColor Red
    exit 1
}

# --- 7. Done --------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " PUSHED TO GITHUB. VERCEL IS DEPLOYING." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Watch the deploy:" -ForegroundColor Yellow
Write-Host "  https://vercel.com/dashboard"
Write-Host ""
Write-Host "Live URL (in 1-2 min):" -ForegroundColor Yellow
Write-Host "  https://alpharesearchcenter.vercel.app/dashboard"
Write-Host "  https://alpharesearchcenter.vercel.app/analyzer"
Write-Host "  https://alpharesearchcenter.vercel.app/watchlist"
Write-Host "  https://alpharesearchcenter.vercel.app/portfolio"
Write-Host "  https://alpharesearchcenter.vercel.app/journal"
Write-Host ""
Write-Host "Rollback (if it looks wrong on Vercel):" -ForegroundColor Yellow
Write-Host "  Copy-Item $backupDir\globals.css.bak  $globalsPath  -Force"
Write-Host "  Copy-Item $backupDir\*tailwind*       $tailwindPath -Force"
Write-Host "  git add -A; git commit -m 'revert: theme'; git push"
Write-Host ""