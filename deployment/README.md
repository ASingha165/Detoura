# DETOURA — 100% Free Cloud Backend Deployment
## Google Colab & Cloudflare Quick Tunnel Guide (Zero-Cost Hosting)

This directory contains the deployment package and notebook to host the existing **Detoura ML Backend** (FastAPI + Gemma 2B GGUF + SQLite + Cloud Firestore) completely free of charge using Google Colab and Cloudflare Quick Tunnel.

---

### Key Highlights & Zero-Cost Guarantees

* **Zero Hosting Costs:** $0.00 spent.
* **No Credit Card Required:** Google Colab Free Tier and Cloudflare Quick Tunnel do not require a credit card or billing account.
* **Real Gemma 2B Inference:** Uses Colab's 12.7 GB RAM and multi-core CPU / T4 GPU to run the full instruction-tuned `gemma-2-2b-it-Q4_K_M.gguf` model (~1.71 GB) without Out-Of-Memory errors.
* **Preserves Existing Architecture:**
  * Embedded SQLite destination catalog (`detoura_master-v2.db`).
  * Cloud Firestore trip persistence and Travel DNA profiles.
  * Server-side cryptographic Firebase ID token verification.
  * Model 2 mathematical scoring algorithms (Cosine similarity + SSI climate + CPI crowd pressure + budget ceiling).
  * Vercel frontend (`https://detoura.vercel.app`).

---

### Files in this Directory

| File | Purpose | Size |
| :--- | :--- | :--- |
| [`Detoura_Colab.ipynb`](file:///d:/Detoura/deployment/Detoura_Colab.ipynb) | Complete 10-cell Google Colab deployment notebook | ~12 KB |
| [`detoura-backend.zip`](file:///d:/Detoura/deployment/detoura-backend.zip) | Clean backend deployment archive (Python sources, SQLite DB, metadata) | ~131 KB |
| [`README.md`](file:///d:/Detoura/deployment/README.md) | Deployment manual & architecture reference | ~4 KB |

---

### Deployment Walkthrough (Step-by-Step)

#### Step 1: Open Google Colab
1. Navigate to [Google Colab](https://colab.research.google.com/) in your web browser.
2. Click **Upload** $\rightarrow$ select [`D:\Detoura\deployment\Detoura_Colab.ipynb`](file:///d:/Detoura/deployment/Detoura_Colab.ipynb).
3. (Optional) In Colab, go to **Runtime** $\rightarrow$ **Change runtime type** $\rightarrow$ select **T4 GPU** for hardware-accelerated token generation, or keep **CPU** for standard inference.

#### Step 2: Run Cells 1 through 4
1. **Cell 1 (Inspection):** Verifies Colab's available RAM (12.7 GB) and disk space (100+ GB).
2. **Cell 2 (Files):** Prompts you to upload `detoura-backend.zip` (located in your local `deployment/` folder). Alternatively, you can run `!git clone https://github.com/ASingha165/Detoura.git /content/repo && cp -r /content/repo/detoura-ml/* /content/Detoura/` directly in Colab for instant recovery without uploading files.
3. **Cell 3 (Dependencies):** Installs FastAPI, Uvicorn, Scikit-learn, Firebase Admin, and `llama-cpp-python` wheels.
4. **Cell 4 (Model):** Automatically downloads `gemma-2-2b-it-Q4_K_M.gguf` (~1.71 GB) from Hugging Face Hub in ~20–30 seconds.

#### Step 3: Configure Firebase (Cell 5)
1. **Cell 5 (Credentials):** Prompts you to upload your Firebase Service Account JSON file (located locally in `D:\Detoura\detoura-ml\credentials\detoura-f8a96-*.json`).
2. The credentials remain private inside your ephemeral Colab environment and are never printed or committed.
3. The cell automatically verifies connectivity to Firestore and project `detoura-f8a96`.

#### Step 4: Launch FastAPI & Cloudflare Tunnel (Cells 6 through 8)
1. **Cell 6 (FastAPI):** Starts Uvicorn in the background on port `8000` with 1 worker.
2. **Cell 7 (Verification):** Tests `/health`, `/health/firebase`, `/destinations`, `/recommend`, and token authorization checks.
3. **Cell 8 (Tunnel):** Downloads official `cloudflared` and launches a Quick Tunnel, generating an official public HTTPS URL:
   ```text
   https://<random-words>.trycloudflare.com
   ```

#### Step 5: Connect to the Vercel Frontend (Cells 9 & 10)
1. Copy the generated HTTPS tunnel URL (e.g. `https://travel-example.trycloudflare.com`).
2. Go to your [Vercel Dashboard](https://vercel.com/) $\rightarrow$ select project **detoura** $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
3. Add / Update the variable:
   * **Key:** `VITE_API_BASE_URL`
   * **Value:** `https://<random-words>.trycloudflare.com` *(without trailing slash)*
   * **Target:** `Production` and `Preview`
4. Go to **Deployments** $\rightarrow$ click the three dots on the latest commit $\rightarrow$ click **Redeploy**.
5. Once redeployment finishes, open [https://detoura.vercel.app](https://detoura.vercel.app)—the production frontend will route all API calls to your live Colab backend!

---

### Security & Authorization Guarantees

* **Firebase Token Verification:** Every request to `/api/users/{uid}/*` strictly verifies the client's Firebase ID token using `firebase_admin.auth.verify_id_token()`.
* **User Data Isolation:** If `decoded_token['uid'] !== requested_uid`, access is blocked with `403 Forbidden`.
* **Zero Secrets in Git:** No private keys or service accounts are committed to Git or embedded in the notebook source.

---

### Runtime Limitations & Lifecycle

* **Session Lifespan:** Google Colab free sessions run continuously while your browser tab remains open (up to 12 hours max per session).
* **Tunnel Dynamic URLs:** Cloudflare Quick Tunnel (`trycloudflare.com`) URLs are generated freshly on each tunnel launch. Whenever you restart your Colab notebook, update `VITE_API_BASE_URL` in Vercel with the new tunnel URL and click **Redeploy**.
* **Zero Cost:** Absolutely zero cloud hosting fees or recurring charges.
