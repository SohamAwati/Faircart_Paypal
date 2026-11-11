# Member 4 workspace: PayPal, Integration & DevOps

A runnable, tested starting point for your part of FairCart Guard. It works **on its own** (in-memory database, dev-stub approval) so you are never blocked by Member 3, and its `repo/` folder drops straight into the team monorepo.

Status (verified in this workspace): `npm run typecheck` is clean and `npm test` passes 28 tests with **mocked** PayPal. Nothing has been run against the real PayPal sandbox yet; that is your first job below.

## What is here

```
member4/
  repo/                       <- copy into the monorepo root (paths already match your owned files)
    apps/api/src/services/paypal/   env, token, http, orders, verify, state, repository, service, webhook, container, dev-stub
    apps/api/src/routes/{payments,webhooks}.ts
    apps/api/src/controllers/{payments,webhooks}.controller.ts
    apps/api/prisma/schema/{payment,webhook}.prisma  + payment_one_active_per_approval.sql
    apps/api/tests/paypal/*.test.ts
    packages/shared/src/payment/index.ts
    render.yaml   postman/faircart-guard.postman_collection.json
  dev/server.ts               <- standalone harness with return/cancel pages (stays here)
  scripts/spike-1-create.sh, spike-2-capture.sh   <- Phase 1 curl spike
```

## Hands-on: do these in order

### Step 1 (15 min): install and prove the code works
```bash
cd member4 && npm install
npm run typecheck && npm test        # expect 28 passing
```

### Step 2 (30 min): PayPal sandbox accounts
1. developer.paypal.com/dashboard, switch to **Sandbox**.
2. Apps & Credentials: create an app (Merchant). Copy Client ID and Secret.
3. Sandbox accounts: make sure you have a **Business** and a **Personal** account, both with country **United States**. Note the Personal (buyer) email and password.
4. `cp .env.example .env` and paste the Client ID and Secret. Leave the rest.

### Step 3 (30 min): the manual spike (this is real evidence, not code)
```bash
npm run spike:create            # USD 215.00: prints status, debug id and the approval link
npm run spike:create INR 17910.00   # test INR once and record what happens (expected to fail)
# open the payer-action (or approve) link in a browser, log in as the sandbox BUYER, approve
npm run spike:capture <ORDER_ID>
```
Write order id, capture id, link type, statuses and `paypal-debug-id` into `docs/paypal-spike.md`. Announce the currency decision (USD recommended) to the team today.

### Step 4 (30 min): run your own code against the real sandbox
```bash
npm run dev                     # http://localhost:4000
```
Open http://localhost:4000, click **Pay with PayPal**, approve as the buyer, and you land on the return page which calls your capture endpoint. You should see `status: COMPLETED` with an order ID and capture ID. Refresh the return page: you should get the same result with **no second capture**. Try the cancel button at PayPal: status becomes `CANCELLED`.

If the status is `PENDING_REVIEW`, read `failureReason`; it tells you which check failed (amount, currency, reference, pending).

### Step 5 (45 min): webhooks
1. `ngrok http 4000`, copy the https URL.
2. Dashboard, your sandbox app, Webhooks, Add webhook: `https://<ngrok>/api/webhooks/paypal`; subscribe to checkout order approved and the capture events (completed, pending, denied, refunded). Copy the **Webhook ID** into `.env` as `PAYPAL_WEBHOOK_ID`, restart `npm run dev`.
3. Do a real payment again. Watch the harness log and confirm the webhook is accepted. Save one real event JSON in `docs/samples/` and check where the order id sits in the capture event (the code reads `resource.custom_id` first, then `resource.supplementary_data.related_ids.order_id`; **verify against the real payload**).
4. Dashboard simulator events are commonly reported not to pass real signature verification, so test with a real payment.

### Step 6 (when Member 3's scaffold is ready): move into the monorepo
1. Copy everything inside `repo/` into the monorepo root (paths already match). Add `decimal.js`, `express-rate-limit` and `zod` to `apps/api/package.json` (dependency adds are allowed for everyone).
2. Rename `repository.prisma.ts.example` to `repository.prisma.ts`, run Prisma generate after Member 3 merges the schema.
3. Ask Member 3 to: add a `getApprovedPayable(requestId)` function that returns `{ requestId, approvalId, quoteId, amount: Decimal, currency, description, valid }`; add the Payment migration including `payment_one_active_per_approval.sql`; and in `app.ts` mount the webhook router **before** `express.json()`:
```ts
app.use("/api", webhooks);   // raw body for signature verification
app.use(express.json());
configurePayments({ repo: new PrismaPaymentRepository(prisma), payables: myApprovalProvider });
```
4. Remove the dev stub: set `PAYMENTS_DEV_STUB` unset in the monorepo (it is also ignored when `NODE_ENV=production`).
5. Branch `m4/payments`, run `npm run check:ownership`, open a PR.

### Step 7: deploy and evidence
Use `repo/render.yaml` (verify it against Render's current Blueprint docs and free-plan limits), set secrets in the Render dashboard, register a webhook for the Render URL, run the full checkout on staging twice, save order and capture IDs and screenshots, and fill `docs/paypal-spike.md` honestly (write "not verified" for anything you did not run).

## Rules this code enforces (do not weaken them)
- Amount and currency come from the approval record, never from the request body.
- Capture only from `APPROVAL_PENDING`, via an atomic claim, so parallel calls capture once (tested: 10 parallel calls, one PayPal capture).
- `verifyPayPalCapture` decides success: order id, reference, status, currency and amount must all match, otherwise `PENDING_REVIEW` or `FAILED`.
- Webhooks: raw body, PayPal signature verification, idempotent by event id, final states never regress.
- `PAYPAL_BASE_URL` must be the sandbox URL or the app will not start.

## Known gaps (be honest about them)
- Not yet run against the real sandbox; the webhook payload paths and the approval link type are assumptions to confirm in Steps 3 and 5.
- The Prisma repository is a template; the partial unique index needs Member 3's migration.
- The Agent Toolkit is not included (do the one-hour check from the playbook only if time allows).
- No login/authorization yet: add the team's auth check in the controllers once the model is decided.
