# =============================================================
# AlphaResearch — Commit A: OANDA Style Signatures (CSS only)
# File: deploy-styles.ps1
# Run from project root: C:\Websites Project\Alpha Research Center
#
# Ships extended globals.css (4 OANDA signatures, opt-in classes).
# ZERO risk: no component edits, no content changes.
# Only the grid texture appears immediately; top-borders &
# section-bars activate when YOU add classes (see CLASS-GUIDE.md).
# =============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Commit A  OANDA Style Signatures  (CSS only)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    Write-Host "ERROR: not a git repo. Run from project root." -ForegroundColor Red; exit 1
}

# Locate the ACTIVE globals.css (the one layout.tsx imports: frontend/app/globals.css)
$globalsPath = $null
foreach ($p in @("frontend\app\globals.css","frontend\src\app\globals.css","app\globals.css")) {
    if (Test-Path $p) { $globalsPath = $p; break }
}
if (-not $globalsPath) { Write-Host "ERROR: globals.css not found." -ForegroundColor Red; exit 1 }
Write-Host "Active globals -> $globalsPath" -ForegroundColor Green

if (-not (Test-Path ".\globals.css")) {
    Write-Host "ERROR: new globals.css not in current folder." -ForegroundColor Red; exit 1
}

# Backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = ".theme-backup-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item $globalsPath "$backupDir\globals.css.bak" -Force
Write-Host "Backup -> $backupDir\globals.css.bak" -ForegroundColor Yellow

# Install
Copy-Item ".\globals.css" $globalsPath -Force
Write-Host "Installed new globals.css" -ForegroundColor Green
Write-Host ""

git add $globalsPath
git status --short
Write-Host ""
$confirm = Read-Host "Commit and push? Vercel auto-deploys. (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Aborted. File installed locally, not pushed." -ForegroundColor Yellow; exit 0
}

$branch = git rev-parse --abbrev-ref HEAD
git commit -m "feat(ui): OANDA style signatures - grid texture + opt-in accent classes"
git push origin $branch

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " PUSHED. Vercel is deploying." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Expect: faint grid texture appears site-wide immediately." -ForegroundColor Yellow
Write-Host "Top-borders + section-bars stay dormant until you add classes" -ForegroundColor Yellow
Write-Host "(see CLASS-GUIDE.md)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Rollback:" -ForegroundColor Gray
Write-Host "  Copy-Item $backupDir\globals.css.bak $globalsPath -Force; git add -A; git commit -m 'revert'; git push"
Write-Host ""