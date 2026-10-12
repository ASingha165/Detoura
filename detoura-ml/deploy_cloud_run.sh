#!/usr/bin/env bash
# ==============================================================================
# DETOURA ML — Google Cloud Run Automated Deployment Script (Bash)
# ==============================================================================
set -e

PROJECT_ID="detoura-f8a96"
SERVICE_NAME="detoura-ml"
REGION="asia-south1"

echo "=========================================================="
echo "  DETOURA ML — Cloud Run Deployment Preparation"
echo "=========================================================="

# 1. Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "[ERROR] Google Cloud CLI (gcloud) is not installed."
    echo "Install it via: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 2. Check Authentication
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
    echo ""
    echo "[AUTH REQUIRED] You are not currently logged in to Google Cloud CLI."
    echo "Please authenticate by running:"
    echo "   gcloud auth login"
    echo "Then rerun this deployment script."
    echo ""
    exit 1
fi
echo ""
echo "[AUTH OK] Logged in as: $ACTIVE_ACCOUNT"

# 3. Set active project
echo ""
echo "[1/4] Setting active project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# 3. Enable required Google Cloud APIs
echo ""
echo "[2/4] Ensuring required Google Cloud APIs are enabled..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# 4. Deploy to Cloud Run using Cloud Build
echo ""
echo "[3/4] Building container and deploying to Cloud Run ($REGION)..."
echo "Allocating 4GiB RAM and 2 vCPUs for Gemma 2B GGUF inference..."

gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --memory 4Gi \
    --cpu 2 \
    --timeout 300 \
    --concurrency 8 \
    --min-instances 0 \
    --max-instances 2 \
    --execution-environment gen2 \
    --set-env-vars "FIREBASE_PROJECT_ID=$PROJECT_ID,PORT=8000,GEMMA_THREADS=4"

# 5. Retrieve HTTPS Service URL
echo ""
echo "[4/4] Retrieving deployed service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(status.url)")

echo ""
echo "=========================================================="
echo "  DEPLOYMENT SUCCESSFUL!"
echo "  Backend Service URL: $SERVICE_URL"
echo "=========================================================="
echo ""
echo "Next Step: Connect Vercel Frontend"
echo "1. Go to Vercel -> Project Settings -> Environment Variables"
echo "2. Add/Update: VITE_API_BASE_URL = $SERVICE_URL"
echo "3. Redeploy frontend on Vercel"
