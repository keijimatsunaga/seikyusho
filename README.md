# Multi-tenant Invoicing MVP

Next.js + TypeScript + Prisma based MVP for tenant-scoped invoicing.

## Design choices
- **Auth**: simple internal header-based session helper for MVP (`x-tenant-id`, `x-user-id`, `x-role`). In production this should be replaced with Auth.js or equivalent session middleware.
- **Versioning policy**: each invoice keeps immutable snapshots in `invoice_versions.snapshot_json`; editing is allowed only during `DRAFT`. After issue, any content change must be done by creating a **new invoice** (new invoice number). This keeps issued invoice immutable and auditable.
- **Line items storage**: stored inside `snapshot_json` to keep a complete immutable rendering source (including PDF content) for each version.
- **Email**: provider abstraction with `StubEmailProvider`.
- **PDF**: server-side generation with `pdfkit`, based on `snapshot_json`.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables:
   - `DATABASE_URL` (PostgreSQL)
   - `APP_URL` (e.g. `http://localhost:3000`)
3. Run Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```
4. Start app:
   ```bash
   npm run dev
   ```

## Tests
```bash
npm test
```

## Security notes
- Tenant scoping enforced via session tenant ID in admin APIs.
- Customer routes require signed+expiring tokens (hash stored in DB; raw token not persisted).
- Token view endpoints include lightweight in-memory rate limiting (dev only); use Redis / edge rate limit in production.
- Customer APIs intentionally return 404 for missing/invalid tokens to reduce invoice ID enumeration.
- Security headers + CSP are set via helper.

## Threat model (brief)
- **Token theft**: limited by expiry and hash-at-rest.
- **Tenant breakout**: prevented by tenant-scoped query paths.
- **Tampering after issue**: prevented by draft-only edits and immutable snapshots.
- **Audit deletion risk**: events are append-only by code path; DB permissions should also enforce append-only in production.

## Operational notes
- Token expiry defaults to 7 days.
- Stub email provider logs safe metadata only.
- Sensitive links are redacted from event payload logs.

## Assumptions
- MVP internal auth is acceptable via middleware-compatible headers for local/dev.
- Payment integration is out of scope; `markPaid` is manual/system-triggered.
- Status transition `ISSUED -> SENT -> VIEWED -> PAID` is monotonic for core happy path.

## Vercel deployment tip
- ルート `/` は疎通確認ページを返します（404回避）。
- Vercel には最低限 `DATABASE_URL` と `APP_URL` を設定してください。


## Vercel 404 troubleshooting
- Vercel の **Root Directory** がこのリポジトリ直下 (`/`) になっているか確認してください。
- `build` スクリプトは `next build` を使います（このリポジトリでは設定済み）。
- デプロイログで `next build` が実行されていることを確認してください。
- それでも 404 の場合は、最新デプロイ URL ではなく Production Alias の URL を開いていないか確認してください。
