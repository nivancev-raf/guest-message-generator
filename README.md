# Guest Message Generator

A Progressive Web App (PWA) for generating personalized messages for apartment guests. This app helps property managers create standardized welcome messages with specific apartment details, parking information, and check-in instructions.

## 🌐 Live Demo

Visit the app: [https://nivancev-raf.github.io/guest-message-generator/](https://nivancev-raf.github.io/guest-message-generator/)

## ✨ Features

- **Login**: Each user logs in with email + password and stays logged in (also in the home screen app)
- **Sign up**: Anyone can create their own account (name, email, password) and confirm it via email
- **Forgot password**: A reset link is sent by email; the link opens the app to set a new password
- **Private apartment data**: Apartment details live in a Supabase database, never in this repository. Row Level Security makes sure every user sees only their own apartments
- **Bottom tab bar**: Generate, Apartments (add / edit / delete), Templates (message editor), Profile (name, log out)
- **Apartment management**: Add, edit and delete apartments directly in the app
- **Per-apartment messages**: Reservation and garage messages can be edited per apartment, language and message type
- **My profile**: Change the name shown in the greeting
- **Free trial + subscription**: 7 days free, then €5 / month through Polar, unlocked automatically
- **Message Generation**: Automatically generate personalized welcome messages (Serbian / English)
- **WhatsApp Integration**: Send messages directly via WhatsApp
- **PWA Support**: Install as a mobile app ("Add to Home Screen")
- **Responsive Design**: Built mobile-first

## 🔐 Backend setup (Supabase, free plan)

1. Create a project on [supabase.com](https://supabase.com)
2. **Authentication → Sign In / Providers → Email**: enable *Allow new users to sign up* and *Confirm email*
3. **Authentication → URL Configuration**: set *Site URL* to `https://nivancev-raf.github.io/guest-message-generator/` and add the same URL (plus `http://localhost:8000/` for local testing) to *Redirect URLs*. Confirmation and password reset links only open allowed URLs
4. **Authentication → SMTP Settings** (*Emails → SMTP* in newer dashboards): the built-in email service only sends a few emails per hour and is meant for testing. For real users enable custom SMTP, e.g. Gmail (`smtp.gmail.com`, port `465`, your Gmail address as user and a Google [App Password](https://myaccount.google.com/apppasswords) as password)
5. Optional: **Authentication → Email Templates** to translate the *Confirm signup* and *Reset password* emails
6. **SQL Editor**: run [`supabase/schema.sql`](supabase/schema.sql). It also creates a trigger that adds a profile for every new account. Apartments are added by users in the app (or with a data script kept outside of the repository)
7. **Project Settings → API**: put the API URL and the **Publishable key** (or the legacy `anon` key) into `config.js` — never the secret key (both are public by design; data is protected by login + RLS)
8. **GitHub → Settings → Secrets and variables → Actions**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` so the keep-alive workflow can write a timestamp to the database every day (free Supabase projects are paused after 7 days of inactivity). The workflow only runs from the default branch (`main`)

> Never commit apartment details, emails or passwords to this repository.

## 💳 Payments (7-day free trial, then €5 / month via Polar)

How it works: every new account gets 7 free days. After that, tapping **Generate** opens a
"Your free trial has ended" sheet; apartments and templates stay viewable. **Subscribe** asks the
`polar-checkout` Edge Function for a Polar payment page tied to the logged-in account. When the
payment goes through, Polar calls the `polar-webhook` Edge Function, which writes the subscription
into `public.subscriptions`, and the app unlocks within a few seconds. Renewals, cancellations and
failed payments arrive the same way. **Manage subscription** (Profile) opens Polar's customer portal.
Users can only *read* their own subscription row; the Polar keys live only in Supabase secrets.

Accounts that exist when you run the SQL below stay **free forever**.
Until `PAYMENTS_ENABLED` is `true` in `config.js`, payments are off and nobody is blocked.

Polar has two separate worlds with separate accounts, products, tokens and webhooks:
**sandbox.polar.sh** (test cards, for testing) and **polar.sh** (real money). Do everything below in the
sandbox first, then repeat steps 2–4 in production when going live.

### 1. Database
**SQL Editor**: run the updated [`supabase/schema.sql`](supabase/schema.sql) (safe to run again).
It adds the `subscriptions` table, starts a trial for every new sign-up and marks all existing accounts
as free forever.

### 2. Polar (start in the sandbox: sandbox.polar.sh)
1. **Products → New product**: name `SmartHost Monthly`, **Subscription**, €5 every month, no trial
   (the app already gives 7 days). Save, then copy the product **ID** (product page → ⋯ / Copy ID).
2. **Settings → Developers → Access Tokens → New token** with the scopes `checkouts:write` and
   `customer_sessions:write`. Copy it (it is shown once). It is a secret: never put it in the app or GitHub.

### 3. Edge Functions (Supabase)
Create two functions with **Edge Functions → Deploy a new function → Via Editor**, each named exactly
as below, pasting the file's contents:
- `polar-checkout`: [`supabase/functions/polar-checkout/index.ts`](supabase/functions/polar-checkout/index.ts)
- `polar-webhook`: [`supabase/functions/polar-webhook/index.ts`](supabase/functions/polar-webhook/index.ts)

For **both**, turn **off** *Enforce JWT verification* in the function's settings. Both check every
request themselves (`polar-checkout` checks the user's login, `polar-webhook` checks Polar's signature).
CLI alternative: `supabase functions deploy polar-checkout --no-verify-jwt` (same for `polar-webhook`).

### 4. Connect the two
1. Polar **Settings → Webhooks → Add endpoint**: URL
   `https://YOUR-PROJECT.supabase.co/functions/v1/polar-webhook`, format **Raw**, and all
   `subscription.*` events (`subscription.created`, `.updated`, `.active`, `.canceled`, `.uncanceled`,
   `.revoked`, `.past_due`, `.paused`, `.resumed`). Copy its **secret**.
2. Supabase **Edge Functions → Secrets**: add
   - `POLAR_ACCESS_TOKEN` = the access token from step 2
   - `POLAR_PRODUCT_ID` = the product ID from step 2
   - `POLAR_WEBHOOK_SECRET` = the webhook secret
   - `POLAR_SERVER` = `sandbox` (change to `production` when going live)

### 5. Test (on your computer, not on the live site)
1. In `config.js` set `PAYMENTS_ENABLED = true`, but **do not commit it yet**. Run the app locally
   (`python -m http.server 8000`, open `http://localhost:8000/`).
2. Sign up with a test account, then end its trial in the **SQL Editor**:
   `update public.subscriptions set trial_ends_at = now() where user_id = (select id from auth.users where email = 'TEST@EMAIL');`
3. Tap Generate → Subscribe, pay with card `4242 4242 4242 4242`, any future date, any CVC.
   The app unlocks a few seconds later; Profile shows the plan, and Manage subscription opens Polar's portal.
   Polar → Webhooks shows each delivery, Supabase → Edge Functions → Logs shows what happened.

### 6. Go live
1. In **polar.sh** (production): finish the payout account (Stripe, Serbian IBAN), then repeat steps 2 and 4
   there (product, access token, webhook) and put the production values in the Supabase secrets,
   with `POLAR_SERVER` = `production`.
2. Polar may review the product and website before payouts. Have a public page with a description,
   pricing, Terms / Privacy / Refund pages and a contact email.
3. Set `PAYMENTS_ENABLED = true` in `config.js`, commit and deploy.

> Messages are generated in the browser, so a technical user could get around the paywall.
> The payment records themselves cannot be faked.

## 📱 Installation

### As a Web App
- Visit the URL in any modern browser and log in
- On mobile devices, you can "Add to Home Screen" for app-like experience (log in once inside the home screen app)

### Local Development
1. Clone the repository
2. Serve the folder: `python -m http.server 8000` or use Live Server extension in VS Code

## 🏗️ Project Structure

```
├── index.html          # Login / sign up / password reset, main form and message editor
├── styles.css          # All CSS styles and responsive design
├── config.js           # Supabase project URL + anon (public) key
├── auth.js             # Login, sign up, password reset, session (Supabase Auth)
├── api.js              # Data access layer (profiles, apartments)
├── templates.js        # Default message templates + placeholder rendering
├── menu.js             # Navigation: bottom tab bar, top bar and views
├── apartments.js       # Apartment list + add / edit / delete form
├── editor.js           # Templates view (apartment, language, message type)
├── profile.js          # Profile view (display name, log out)
├── subscription.js     # Free trial banner, paywall sheet, Plan card in Profile
├── app.js              # Main application logic and DOM manipulation
├── utils.js            # Date formatting helpers
├── pwa.js              # Progressive Web App functionality
├── sw.js               # Service Worker (network first, offline fallback)
├── manifest.json       # PWA manifest file
├── supabase/schema.sql # Database tables + Row Level Security policies
├── supabase/functions/polar-checkout/index.ts  # Opens the Polar payment page / customer portal
├── supabase/functions/polar-webhook/index.ts   # Unlocks accounts when Polar reports a payment
├── .github/workflows/keepalive.yml  # Daily keep-alive write to Supabase
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
└── README.md           # Project documentation
```

## ✉️ Message placeholders

Templates can use: `{{guest_name}}`, `{{check_in}}`, `{{check_out}}`, `{{price}}`, `{{location}}`,
`{{address}}`, `{{building}}`, `{{apartment}}`, `{{entrance}}`, `{{floor}}`, `{{parking}}`, `{{garage_level}}`, `{{pillar}}`
(the garage pillar, e.g. `K6`; optional per apartment).
Templates that are not customized fall back to the defaults in `templates.js`.

## 📋 Usage

1. **Log in**: Only needed once per device. New users tap *Create account*, confirm the email and add their first apartment; *Forgot password?* sends a reset link
2. **Select Apartment**: Choose from the dropdown list (your default apartment is preselected)
3. **Enter Guest Details**: Fill in guest name and mobile number (with country code)
4. **Set Dates**: Select check-in and check-out dates
5. **Generate Message**: Click "Generate Message" to create the personalized text
6. **Edit (optional)**: Tap *Edit* on the generated message to change just this message; the template stays as it is
7. **Send Message**: WhatsApp opens the chat with the message filled in. Viber copies the message and opens the chat with the guest, so you only paste and send. Or copy it to the clipboard
8. **Tabs**: manage apartments, edit templates, change your name or log out

## 🌍 Browser Support

- Chrome/Chromium (recommended)
- Safari (iOS and macOS)
- Firefox
- Edge

## 🔄 Updates

The app automatically updates when new versions are deployed. The service worker always tries the network first and falls back to the cached files when offline.

## 📄 License

This project is for personal/business use. Feel free to modify according to your needs.