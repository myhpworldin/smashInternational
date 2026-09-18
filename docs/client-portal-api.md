# Client Portal API — Stage 1 Phase 16

How the client portal frontend (Phases 5–15) gets its data, and the ownership/authorization rules every current and future client-facing data source must follow.

## Architecture: most "APIs" are direct server calls, not REST

This app is a Next.js App Router project. Every `/dashboard/*` page is a Server Component that calls a `server/services/*.service.ts` function directly during render — there is no HTTP round trip, no separate REST layer, and therefore no separate serializer step to keep in sync with one. The "API" for something like the dashboard, profile, or onboarding view **is** `resolveOnboardingIdentity()` / `buildDashboardData()` / etc., called from the page itself.

A small number of real REST routes exist for the cases that genuinely need a client-side fetch (a `"use client"` component, a login-time redirect decision, or the file-serving route). Adding new REST routes for data that a Server Component can just call directly would duplicate this architecture, not extend it — Phase 16 does not do that.

### Real REST routes (client-authenticated)

| Route | Method | Auth | Ownership rule |
|---|---|---|---|
| `/api/onboarding` | GET / PUT | session (or anonymous draft cookie) | `resolveOnboardingIdentity()` resolves the draft from the session/cookie alone — never a request-supplied id |
| `/api/onboarding/submit` | POST | session required | same identity resolution as above |
| `/api/onboarding/assets/[assetId]/file` | GET | session or anonymous cookie owner, or admin | `isOwnedByClient(asset.clientId, doc.clientId)` — see `server/auth/ownership.ts` |
| `/api/onboarding/assets/[assetId]` | DELETE | session/cookie owner | `deleteAsset(assetId, clientId)` — ownership enforced as a query filter in the repo, not fetch-then-compare |
| `/api/client/service-engagements` | GET | `getAuthorizedClient()` (role must be `client`) | `clientId` taken from the session-derived user, never a query param |

### Server-called data (everything else: dashboard, profile, onboarding view, services, projects, campaigns, performance, reports, budget, approvals, deliverables, documents, notifications, activity, messages, support)

Each `/dashboard/*` page calls its own `server/services/*.service.ts` function with the session-derived `clientId`. Detail pages (`/dashboard/services/[id]`, `/dashboard/projects/[id]`, etc.) call a `getXForClient(id, clientId)` function that returns `null` for both "doesn't exist" and "belongs to someone else" — the page then calls Next's `notFound()`, so a client can never distinguish "wrong id" from "someone else's real id" by the response.

## Client identity resolution (already established, reused — not rebuilt this phase)

```
authenticated session (httpOnly cookie, verified via server/auth/session.ts)
  → getCurrentUser() / getAuthorizedClient()   (server/auth/dal.ts)
  → user.clientId                              (never trusted from the request)
  → server/services/*.service.ts functions scoped to that clientId
```

`requireRole("client")` in `src/app/dashboard/layout.tsx` gates every page under `/dashboard`; `getAuthorizedClient()` gates the one client-role-only API route.

## Centralized ownership check (new this phase)

`src/server/auth/ownership.ts` — `isOwnedByClient()` / `assertClientOwnership()`. Replaces each `getXForClient` function's own inline `!doc || !doc.clientId.equals(clientId)`. Applied this phase to `getEngagementForClient` (the one lookup with a real document to check) and the asset file route. Every future backend phase's `getProjectForClient`, `getCampaignForClient`, `getReportForClient`, `getApprovalForClient`, `getDeliverableForClient`, `getConversationForClient`, and `getSupportTicketForClient` (currently honest-empty stubs) should adopt the same helper the moment they have a real document to check, instead of growing their own slightly different version.

## Client-safe serialization (already established, reused — not rebuilt this phase)

Every service function that returns client-facing data maps its Mongo document to a plain row/DTO shape before returning (e.g. `serviceEngagements.service.ts`'s `toRow()`, `onboarding.service.ts`'s status-history mapper) — no raw Mongoose/driver document, no internal fields (staff notes, actor identities, audit metadata), is ever returned from a `*ForClient` function.

## Mock data status

No production client-portal code contains embedded mock/fixture values. Every future-backend area (projects, campaigns, performance, budget-actuals, reports, approvals, deliverables, messages, support) returns a real, honest `[]`/`null` from its adapter today — there is nothing to "replace" per Phase 16 §29, because nothing was ever faked. The one fixture file that exists (`src/lib/dashboard/devFixtures.ts`) is explicitly dev-only and imported by nothing in `src/app` or `src/server`.
