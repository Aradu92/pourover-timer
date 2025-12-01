# Security & Secrets

This document explains how to configure secrets for the repo and deployment.

## Required GitHub Secrets

- `JWT_SECRET` (string) — cryptographically secure secret used to sign JWTs in production.
  - Generate using a secure generator (OpenSSL/Node/other) and set it in your GitHub repo Secrets.
- `GCP_SA_KEY` (JSON) — if you're deploying to GCP, this should be your service account JSON credential for deployment.
- `GCP_PROJECT_ID` — Google Cloud project ID (used by the deploy workflow).

## Recommended additional secrets

- `DATABASE_URL` — connection string for your database (if you add DB support).
- `SENTRY_DSN` — if you're using Sentry for error monitoring.

## How to add GitHub secrets via the UI

1. Navigate to the repository in GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Click on **New repository secret**.
4. Enter the name (e.g., `JWT_SECRET`) and the **secret value** (e.g., `$(openssl rand -hex 64)`).
5. Click **Add secret**.

## How to add secrets via GitHub CLI

Use GitHub CLI to set repo secrets (must be authenticated):

```bash
# Set JWT_SECRET with a secure random value (openssl required locally)
gh secret set JWT_SECRET -R <owner>/<repo> -b "$(openssl rand -hex 64)"

# For JSON service account key (example from a file)
gh secret set GCP_SA_KEY -R <owner>/<repo> < service-account.json
gh secret set GCP_PROJECT_ID -R <owner>/<repo> -b "my-gcp-project-id"
```

## Using secrets in GitHub Actions

In workflows, you can access secrets using `${{ secrets.JWT_SECRET }}`.
The `deploy.yml` workflow now uses `JWT_SECRET` to create a Kubernetes secret and patch the deployment so the runtime pod receives the environment variable.

## Kubernetes secret (optional)

If you want to manually create a k8s secret before deploying, you can:

```bash
kubectl create secret generic pourover-timer-secret --from-literal=JWT_SECRET=$(openssl rand -hex 64)
```

## Rotating secrets

When you rotate a secret (e.g., JWT_SECRET), you should also restart the pods so the new value takes effect.
On Kubernetes: `kubectl rollout restart deployment/pourover-timer -n pourover-timer`
