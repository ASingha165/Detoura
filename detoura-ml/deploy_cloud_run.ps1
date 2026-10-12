# ==============================================================================
# DETOURA ML - Google Cloud Run Automated Deployment Script (PowerShell)
# ==============================================================================
#
# This script deploys the Detoura ML backend (FastAPI + Gemma 2B GGUF + SQLite)
# to Google Cloud Run using Google Cloud Build (no local Docker required).
#
# Prerequisites:
# 1. Google Cloud SDK installed (run: winget install Google.CloudSDK)
# 2. Authenticated: gcloud auth login
# 3. Billing enabled on project: detoura-f8a96
# ==============================================================================

$ErrorActionPreference = 'Stop'

$PROJECT_ID = 'detoura-f8a96'
$SERVICE_NAME = 'detoura-ml'
$REGION = 'asia-south1'

Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host '  DETOURA ML - Cloud Run Deployment Preparation' -ForegroundColor Cyan
Write-Host '==========================================================' -ForegroundColor Cyan

# 1. Resolve gcloud CLI in session or standard install locations
$gcloudLocalPath = Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin'
if (Test-Path $gcloudLocalPath) {
    if ($env:Path -notlike ('*' + $gcloudLocalPath + '*')) {
        $env:Path = $gcloudLocalPath + ';' + $env:Path
    }
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] Google Cloud CLI (gcloud) is not found in your PATH.' -ForegroundColor Red
    Write-Host 'Install it using: winget install Google.CloudSDK' -ForegroundColor Yellow
    Write-Host 'Or download from: https://cloud.google.com/sdk/docs/install' -ForegroundColor Yellow
    exit 1
}

# 2. Check Authentication
$activeAccount = (& gcloud auth list --filter=status:ACTIVE --format='value(account)')
if (-not $activeAccount) {
    Write-Host ''
    Write-Host '[AUTH REQUIRED] You are not currently logged in to Google Cloud CLI.' -ForegroundColor Yellow
    Write-Host 'Please run the following command in PowerShell to authenticate:' -ForegroundColor White
    Write-Host '   gcloud auth login' -ForegroundColor Cyan
    Write-Host 'Then rerun this deployment script.' -ForegroundColor White
    Write-Host ''
    exit 1
}
Write-Host ''
Write-Host ('[AUTH OK] Logged in as: ' + $activeAccount) -ForegroundColor Green

# 3. Set active project
Write-Host ''
Write-Host ('[1/4] Setting active project to ' + $PROJECT_ID + '...') -ForegroundColor Green
& gcloud config set project $PROJECT_ID

# 4. Enable required Google Cloud APIs
Write-Host ''
Write-Host '[2/4] Ensuring required Google Cloud APIs are enabled...' -ForegroundColor Green
& gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# 5. Deploy to Cloud Run using Cloud Build (remote container build)
Write-Host ''
Write-Host ('[3/4] Building container and deploying to Cloud Run (' + $REGION + ')...') -ForegroundColor Green
Write-Host 'Allocating 4GiB RAM and 2 vCPUs for Gemma 2B GGUF inference...' -ForegroundColor Gray

$deployArgs = @(
    'run', 'deploy', $SERVICE_NAME,
    '--source', '.',
    '--platform', 'managed',
    '--region', $REGION,
    '--allow-unauthenticated',
    '--memory', '4Gi',
    '--cpu', '2',
    '--timeout', '300',
    '--concurrency', '8',
    '--min-instances', '0',
    '--max-instances', '2',
    '--execution-environment', 'gen2',
    '--set-env-vars', ('FIREBASE_PROJECT_ID=' + $PROJECT_ID + ',PORT=8000,GEMMA_THREADS=4')
)
& gcloud @deployArgs

# 6. Retrieve HTTPS Service URL
Write-Host ''
Write-Host '[4/4] Retrieving deployed service URL...' -ForegroundColor Green
$SERVICE_URL = (& gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

Write-Host ''
Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host '  DEPLOYMENT SUCCESSFUL!' -ForegroundColor Green
Write-Host ('  Backend Service URL: ' + $SERVICE_URL) -ForegroundColor Yellow
Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Next Step: Connect Vercel Frontend' -ForegroundColor White
Write-Host '1. Open your Vercel project dashboard (https://vercel.com/)' -ForegroundColor Gray
Write-Host '2. Go to Settings -> Environment Variables' -ForegroundColor Gray
Write-Host '3. Add or update:' -ForegroundColor Gray
Write-Host '   Key:   VITE_API_BASE_URL' -ForegroundColor Yellow
Write-Host ('   Value: ' + $SERVICE_URL) -ForegroundColor Yellow
Write-Host '4. Trigger a new deployment on Vercel so the frontend builds with the new backend URL.' -ForegroundColor Gray
