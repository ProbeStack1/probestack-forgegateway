# CI/CD – Cloud Run (forgesphere-api-lifecycle)

Build and deploy pipeline for the API Lifecycle UI to **Google Cloud Run**, triggered on push to `main` or via manual workflow dispatch.

## Workflow files

- **`.github/workflows/deploy.yml`** – GitHub Actions: same job structure as apidesign-ui (Checkout → Set up Node.js → Install dependencies → Build app → then GCP auth + Deploy to Cloud Run).  
- **`cloudbuild.yaml`** – Cloud Build: Docker build, push to Artifact Registry, Cloud Run deploy  
- **`Dockerfile`** – Multi-stage: Node build + nginx serve

**Job steps (aligned with apidesign-ui):** Checkout repository → Set up Node.js → Install dependencies → Build app → Authenticate to Google Cloud → Set up Cloud SDK → Deploy to Cloud Run.

## Required secrets

Configure these in the repo: **Settings → Secrets and variables → Actions**.

| Secret         | Description |
|----------------|-------------|
| **`GCP_SA_KEY`** | JSON key for a GCP service account used by GitHub Actions. Must have: Cloud Build Editor, Cloud Run Admin (or equivalent), Artifact Registry Writer, and (if using same project) Storage Object Viewer for logs. |

No other repository secrets are required. `GITHUB_TOKEN` is provided by GitHub; the workflow does not use Firebase or other third-party secrets.

## Environment / configuration (reused from existing setup)

- **Project:** `probestack-e2068`  
- **Region:** `us-central1`  
- **Service name:** `api_lifecycle_ui`  
- **Artifact Registry repo:** `cloud-run-images` (in same project)  
- **Image tags:** `SHORT_SHA` (7-char commit) and `latest`

## Manual setup in GCP

1. **Service account for GitHub Actions**
   - Create a dedicated service account (e.g. `github-actions-cloudrun`) in project `probestack-e2068`.
   - Grant roles: **Cloud Build Editor**, **Cloud Run Admin**, **Artifact Registry Writer** (for `cloud-run-images`), and **Service Account User** (so Cloud Build can act as the default Cloud Build SA).
   - Create a JSON key and store the full contents as the `GCP_SA_KEY` repo secret.

2. **Artifact Registry**
   - Ensure repository `cloud-run-images` exists in `us-central1` (create with format `docker` if missing).

3. **Cloud Run**
   - No pre-creation needed. The first successful run will create the `api_lifecycle_ui` service in `us-central1`.

4. **APIs**
   - Enable: Cloud Build API, Cloud Run Admin API, Artifact Registry API.

## Deployment verification steps

1. **Trigger a run**
   - Push a commit to `main` or run the workflow via **Actions → Deploy to Cloud Run → Run workflow**.

2. **Check GitHub Actions**
   - Open the **Deploy to Cloud Run** workflow run; job name is **build_and_deploy**.
   - Confirm: Checkout repository → Set up Node.js → Install dependencies → Build app → Authenticate to Google Cloud → Set up Cloud SDK → Deploy to Cloud Run all succeed.

3. **Check Cloud Build**
   - In GCP Console: **Cloud Build → History**.
   - Find the build for this repo; confirm build and push steps succeed, then the deploy step.

4. **Check Cloud Run**
   - **Cloud Run** in `us-central1`: service `api_lifecycle_ui` should list a revision with the latest image.
   - Open the service URL and confirm the UI loads (e.g. root and key routes).

5. **Local Docker build (optional)**
   - From repo root: `docker build -t api-lifecycle-ui:local .`
   - Run: `docker run -p 8080:80 api-lifecycle-ui:local`
   - Open `http://localhost:8080` and verify the app.

6. **Image in Artifact Registry**
   - **Artifact Registry** → `cloud-run-images`: verify images `api_lifecycle_ui:latest` and `api_lifecycle_ui:<SHORT_SHA>` are present after a deploy.

## If "Deploy to Cloud Run" step fails

- **Permission denied / 403:** The `GCP_SA_KEY` service account needs **Cloud Build Editor**, **Service Account User** (for the default Cloud Build SA), **Artifact Registry Writer** on `cloud-run-images`, and **Cloud Run Admin**. In IAM, add these roles to the SA used for the secret.
- **Artifact Registry not found:** Create repository `cloud-run-images` in region `us-central1` (Docker format) under project `probestack-e2068`.
- **APIs disabled:** In GCP, enable **Cloud Build API**, **Cloud Run Admin API**, **Artifact Registry API** for project `probestack-e2068`.
- **Build logs:** In the failed run, open the "Deploy to Cloud Run" step log and the link to the Cloud Build build (if shown). In **GCP Console → Cloud Build → History**, open the failing build for the exact error.

## Summary of changes from source (apidesign-ui)

- **Job name and steps:** Same as apidesign-ui: job **build_and_deploy**; steps **Checkout repository**, **Set up Node.js**, **Install dependencies**, **Build app**, then deploy (here: **Deploy to Cloud Run** instead of Deploy to Firebase Hosting).
- **Trigger:** Same: run on **push to main** and **workflow_dispatch**.
- **Target:** Cloud Run (this repo) instead of Firebase Hosting (apidesign-ui).
- **Secrets:** `GCP_SA_KEY` for this repo (no Firebase secrets).
- **Naming:** Project and region unchanged; service name `api_lifecycle_ui`, image tags `api_lifecycle_ui:<SHORT_SHA>` / `latest`.
