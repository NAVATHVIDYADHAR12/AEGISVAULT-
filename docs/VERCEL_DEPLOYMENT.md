# Deploy the single Next.js application to Vercel

The repository root is the only deployable application. It contains the Next.js landing page, authenticated workspace, and `/api/v1/*` Node.js Route Handler. The API Route Handler runs the existing Express router in-process, so Vercel does not need a second web/API project. `preview.html` is only a design prototype.

## Vercel project settings

Import `NAVATHVIDYADHAR12/AEGISVAULT` and use these settings:

- **Root Directory:** repository root (`./`)
- **Framework Preset:** Next.js
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Output Directory:** leave the Next.js default
- **Node.js:** 22.x (pinned by `package.json` to keep the Vercel build and Function runtime consistent)

These values are also recorded in the root `vercel.json`. Do not create separate Vercel projects for `apps/api` or `apps/web`; the application source now builds from the repository root.

## Environment variables

Add these as server-only variables in the Vercel project for the environments you deploy:

- `DATABASE_URL` — PostgreSQL runtime URL. Use a pooled URL if your database provider recommends one for serverless functions.
- `DATABASE_URL_UNPOOLED` — direct PostgreSQL URL used by Prisma migrations. Neon supplies this alongside `DATABASE_URL` in the Vercel integration.
- `AUDIT_HMAC_KEY` — a base64-encoded random 32-byte key, used only for audit event HMACs.
- `VAULT_KEK_BASE64` — a different base64-encoded random 32-byte key, used to wrap secret data keys.

Generate two independent values locally; run the command twice and enter the outputs only in Vercel's encrypted environment-variable settings:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64') + '\n')"
```

Do not set `DEV_KEK_BASE64` in Vercel. The app permits same-origin CSRF requests for each Vercel deployment URL and does not require a hard-coded preview hostname. `WEB_ORIGIN` is only needed when intentionally allowing an additional trusted origin.

## Database migration

Before signup is used, provision the PostgreSQL database and apply the committed schema using the same production database variables from a trusted terminal or CI job:

```sh
npm ci
npm run db:migrate
```

The Vercel build generates Prisma Client but does not run database migrations. This keeps deployments from applying schema changes unexpectedly. Confirm `/health` returns `{"status":"ok"}` after configuring the database.

## Important key handling

Back up `VAULT_KEK_BASE64` securely. Replacing or losing it without re-wrapping stored data keys makes existing secrets unreadable. This environment-backed adapter enables a single-project deployment; it is not an external KMS/HSM. Add a KMS/HSM adapter and a tested key rotation procedure before using the vault for regulated or high-assurance production workloads.
