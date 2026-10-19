# NORTHLINE Studio V5 — CodeAlpha MERN E-commerce

React 19 / Vite / Express 4 / MongoDB Atlas / JWT / Gmail SMTP / Firebase Authentication.

## What's new in V5

- **Home** is the first desktop/mobile navigation item, linking to `/`.
- New polished **Sign out** button and mobile spacing in the account page.
- **Forgot password:** 6-digit email OTP, single-use 10-minute expiry, max five code attempts per challenge, throttled recovery requests; password reset invalidates existing sessions.
- **Continue with Google** and **Continue with phone number** via Firebase Authentication. Google pop-up sign-in and Firebase SMS/recaptcha verification use ID tokens independently verified by Firebase Admin on the Node.js backend. These features require YOUR Firebase credentials; no placeholder logins.
- Email order confirmations: **Thanks for purchasing with us!** Delivered (after successful SMTP send) to the exact email the customer enters in checkout, while the owner receives order details. The prior transactional email queue, retries, and admin Email Alerts panel are retained. Orders are saved independently of mail delivery.
- Existing e-commerce pages, carts, saved items, MongoDB orders and V4 users remain compatible. SMS-only users must provide an email at checkout for an order email.

## QUICK START — IMPORTANT FOR EXISTING V4 USERS

1. Extract **V5 to a new folder**; **do not delete your working V4**.
2. Copy **V4/server/.env** to **V5/server/.env** so you keep your MongoDB URI, long JWT_SECRET and Gmail SMTP settings. **Do not run `npm run setup` again** if you copied the file; setup is for first-time installs. Never share or commit `.env` or private keys.
3. From the V5 root, run:

```powershell
npm install
npm run migrate:auth
npm run dev
```

4. Open http://localhost:5173.

The one-time **migrate:auth** command converts the previous unique MongoDB email index to a partial unique index so phone-only accounts can exist without dummy email addresses. It keeps existing users and orders. Run only on the target database; back up production data first. It is safe to rerun after a successful migration.

If your old JWT_SECRET changes, existing sessions may sign out. Keep the same secret unless you intentionally want to revoke tokens.

### Customer order confirmation — no extra account integration required

In `server/.env`:

```env
STORE_OWNER_EMAIL=mughees1275@gmail.com
SMTP_USER=mughees1275@gmail.com
SMTP_APP_PASSWORD=YOUR_GOOGLE_16_CHARACTER_APP_PASSWORD
STORE_PUBLIC_URL=http://localhost:5173
```

Use a Google **App Password**, NOT the normal Gmail account password. 2-Step Verification may be required. Keep `.env` private. The display name is **NORTHLINE Studio**, but the actual sender email will be the SMTP_USER Gmail account. Run `npm run check:email` to verify SMTP, then Admin > Email Alerts > Send Test Email.

**What gets emailed?** Add-to-cart alerts go to the owner; successful orders queue a notification to the owner and a customer order confirmation to `shipping.email` (the address typed during checkout). The email includes order number, items, quantity, total, delivery and COD details. Mail jobs can be pending, sent, retry or failed. **Queued is not the same as delivered.** Check Admin > Email Alerts and server logs if customers do not see email; also ask them to check Spam/Promotions. A mistyped checkout email will not be deliverable.

### Password recovery via email OTP

Open `/login` -> **Forgot password?** -> enter the account email -> enter the 6-digit OTP -> set a strong new password -> sign in. Code expiry: 10 minutes; only 5 verification attempts; at most 3 OTP issuance attempts per email/hour with 90-sec cooldown. The response is deliberately generic even for unknown emails, to protect account privacy. OTP is sent using the **same Gmail SMTP**. If Gmail SMTP isn't configured or delivers unsuccessfully, customers will not receive OTP until mail is working. Google-/phone-only accounts should use their provider for sign-in; if a Google account was linked to an existing password account, that password account can still be recovered.

## OPTIONAL: Enable verified Google and phone sign-in (Firebase)

**Firebase is NOT preconfigured.** The email/password registration/login, MongoDB checkout and order emails still work without it.

1. Create a Firebase project at https://console.firebase.google.com/ or choose an existing project. Add a **Web App** (Project settings → Your apps) to view the Firebase Web config.
2. Firebase console → Build → **Authentication** → Sign-in method: enable **Google** and **Phone**. Add `localhost` and your production host to **Authorized domains** (not all Firebase projects include localhost automatically). Phone sign-in uses Firebase reCAPTCHA verification. SMS sending may require billing/region permissions and has quotas; test on real devices or use Firebase Console test phone numbers (development only).
3. Copy `client/.env.example` to **client/.env**. Set the *public browser* config values (API key, authDomain, projectId, appId). These are the project's Web App identifiers, **not secret service account credentials**.
4. Firebase console → Project settings → **Service accounts** → Generate private key JSON. Open it **locally**. In **server/.env**, add the fields below. The service account's **private_key must remain server-side** and must never go into `client/.env`, source code, the ZIP, or GitHub.

```env
# From Firebase service-account JSON, keep the literal \n sequences inside quoted key:
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_LINES\n-----END PRIVATE KEY-----\n"
```

5. Restart `npm run dev`. Visit `/login` or `/register`, click **Continue with Google**, or switch to **Phone**, enter an E.164 phone number such as `+923001234567`, then submit the SMS verification code. Both authenticate via Firebase-issued ID tokens that the backend validates before issuing your store JWT.

**Important:** Google/phone login is not available until you configure Firebase. When not configured, tapping its button shows a setup message rather than falsely claiming sign-in succeeded. The backend ignores self-claimed email/phone fields from the browser for these providers. Never use a production Firebase service-account key in a public frontend.

## Routes

- `/` Home
- `/shop` and `/product/:slug` catalog, product details
- `/cart`, `/checkout`, `/wishlist`
- `/register`, `/login` incl. Google/phone, `/forgot-password` OTP recovery
- `/account`, `/admin`, other editorial and policy pages

## Troubleshooting

| Issue | Action |
| --- | --- |
| `Missing script: setup` | Run commands from V5 root folder, not old `codealpha-ecommerce` |
| MongoDB `ESERVFAIL` | Confirm Atlas hostname, DNS, Network Access IP and connection URI |
| Product proxy `ECONNREFUSED` | Ensure Node backend is running on port 5000 |
| Owner email arrives but customer does not | Check exact checkout address, admin mail queue status, spam, retry errors |
| Password recovery OTP not received | Check SMTP_APP_PASSWORD, `npm run check:email`, MailJob status and email address |
| Google auth `unauthorized-domain` | Add localhost or production domain in Firebase Auth authorized domains |
| Phone SMS not sent | Enable Phone sign-in, verify Firebase region/quota/billing/reCAPTCHA, enter E.164 number |
| `index with name email_1 already exists` | Run `npm run migrate:auth` against your existing MongoDB database |

### Testing status

Backend Node syntax and frontend JSX syntax/parsing can be statically validated. Browser Firebase popup/SMS flows and actual external email delivery can only be end-to-end tested with the user's configured MongoDB, Gmail SMTP, and Firebase providers. Do not treat a queued message as delivered.
