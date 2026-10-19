# NORTHLINE V5 targeted fix

## Changes
- On every route or search parameter change, reset native and Lenis scroll state immediately. Hash anchor navigation is preserved.
- Prioritize confirmation emails for the order being placed over unrelated cart alerts on Vercel.
- Checkout now differentiates a sent email from a pending/queued one.

## Deploy
1. Back up the working repository and `.env` files.
2. Merge this source into the existing repository, without overwriting environment variables.
3. `npm install` then `npm run build --prefix client`.
4. Commit and push to GitHub. Let BOTH Vercel projects redeploy.
5. Verify `server` Vercel environment has SMTP_USER, SMTP_APP_PASSWORD and STORE_OWNER_EMAIL set correctly.
6. Place an order using a customer email you control. Admin > Email alerts: check `order_customer` has status `sent`. Check inbox, spam and promotions.

Note: A queued email is not proof of delivery. Vercel SMTP networking and Gmail limits may still prevent sending; inspect admin email job `lastError` and Vercel runtime logs. Retries on Vercel need a scheduled worker or manual admin retry, because background timers are not reliable. The checkout remains successful if SMTP fails.
