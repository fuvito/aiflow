# AiFlow — Deployment Guide

AiFlow deploys as two independent services:

- **Backend** — AWS Lambda + API Gateway via AWS SAM
- **Frontend** — AWS Amplify (static hosting, built from `frontend/dist`)

---

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installed
- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.12+
- A Supabase project with `schema.sql` applied
- An LLM API key (OpenAI or compatible)

---

## Step 1 — Create a dedicated IAM user

Create a project-scoped AWS IAM user so deployments never use shared credentials.

### 1a — Create the user

AWS Console → **IAM → Users → Create user**

- Username: `aiflow-deploy`
- Access type: **Programmatic access only** (no Console login needed)

### 1b — Attach managed policies

Attach all 6 of these AWS managed policies:

| Policy | Why SAM needs it |
|---|---|
| `AWSCloudFormationFullAccess` | Creates / updates / deletes the stack |
| `AmazonS3FullAccess` | Uploads deployment artifacts to the SAM bucket |
| `AWSLambda_FullAccess` | Creates and updates the Lambda function |
| `AmazonAPIGatewayAdministrator` | Creates the API Gateway |
| `IAMFullAccess` | Creates the Lambda execution role (SAM does this automatically) |
| `CloudWatchLogsFullAccess` | Creates log groups for Lambda |

### 1c — Create access keys

**IAM → Users → aiflow-deploy → Security credentials → Create access key**

- Use case: **Command Line Interface (CLI)**
- Copy both keys — the secret is only shown once

### 1d — Configure a named AWS profile

```powershell
aws configure --profile aiflow
```

Enter when prompted:
```
AWS Access Key ID:     <your access key>
AWS Secret Access Key: <your secret key>
AWS Default region:    us-east-1
Default output format: json
```

Verify it works:
```powershell
aws sts get-caller-identity --profile aiflow
```

You should see the `aiflow-deploy` user ARN. The `aiflow` profile is already set in `samconfig.toml` — every `sam deploy` uses it automatically without touching your default credentials.

---

## Step 2 — Deploy the backend (Lambda + API Gateway)

### 2a — First deploy

```powershell
cd C:\dev\aiflow
sam build
sam deploy --guided
```

When prompted, enter:

| Parameter | Value |
|---|---|
| `LLMApiKey` | Your OpenAI API key |
| `SupabaseUrl` | `https://your-project.supabase.co` |
| `SupabaseServiceRoleKey` | From Supabase Dashboard → Settings → API |
| `SupabaseJwtSecret` | From Supabase Dashboard → Settings → API |
| `FrontendOrigin` | Your Amplify URL (e.g. `main.d1abc.amplifyapp.com`) — **without** `https://` |
| `AdminEmail` | Your email — auto-promoted to approved admin on startup |

SAM will output the **API Gateway URL** at the end — copy it, you'll need it for the frontend env var.

### 2b — Subsequent deploys

```powershell
sam build && sam deploy
```

---

## Step 3 — Deploy the frontend (Amplify)

### 3a — Connect repo to Amplify

AWS Console → **Amplify → Create new app → From Git**

- Provider: GitHub
- Repo: `fuvito/aiflow`
- Branch: `main`
- Build settings: Amplify will detect `amplify.yml` automatically

### 3b — Set environment variables

In Amplify → App settings → Environment variables, add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | The API Gateway URL from Step 2a (e.g. `https://abc123.execute-api.us-east-1.amazonaws.com/Prod`) |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | From Supabase Dashboard → Settings → API |
| `VITE_TURNSTILE_SITE_KEY` | Your Cloudflare Turnstile site key |

### 3c — Trigger a deploy

Push any commit to `main` — Amplify builds and deploys automatically. Or click **Run build** in the Amplify console.

---

## Step 4 — Post-deploy checklist

- [ ] `GET https://<api-gateway-url>/api/health` returns `{"status": "ok"}`
- [ ] Landing page loads at the Amplify URL
- [ ] Login works and redirects to `/app`
- [ ] Workflow generate and simulate work end-to-end
- [ ] Admin panel accessible at `/app/admin`
- [ ] Backend logs show `bootstrap: promoted <email> to approved admin` on startup

---

## Env var reference

### Backend (Lambda — set via SAM parameters)

| Variable | Description |
|---|---|
| `LLM_API_KEY` | LLM provider API key |
| `LLM_MODEL` | Model name (default: `gpt-4o-mini`) |
| `LLM_BASE_URL` | Leave empty for OpenAI |
| `CORS_ORIGINS` | Set automatically from `FrontendOrigin` parameter |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (never expose to frontend) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `ADMIN_EMAIL` | Auto-promoted to approved admin on startup |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `DEMO_MAX_EXECUTIONS_PER_DAY` | Default: 10 (0 = unlimited) |
| `DEMO_MAX_LLM_REQUESTS_PER_DAY` | Default: 20 (0 = unlimited) |
| `APPROVED_MAX_EXECUTIONS_PER_DAY` | Default: 0 (unlimited) |
| `APPROVED_MAX_LLM_REQUESTS_PER_DAY` | Default: 0 (unlimited) |

### Frontend (Amplify environment variables)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API Gateway URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (safe to expose) |
