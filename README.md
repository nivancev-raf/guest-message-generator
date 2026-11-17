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
- **Free trial + subscription**: 7 days free, then €5 / month through Lemon Squeezy, unlocked automatically
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

## 💳 Payments (7-day free trial, then €5 / month via Lemon Squeezy)

How it works: every new account gets 7 free days. After that, tapping **Generate** opens a
"Your free trial has ended" sheet; apartments and templates stay viewable. **Subscribe** opens the
Lemon Squeezy checkout with the user's account id attached. When the payment goes through, Lemon
Squeezy calls the `lemon-squeezy-webhook` Edge Function, which writes the subscription into
`public.subscriptions` and the app unlocks within a few seconds. Renewals, cancellations and failed
payments arrive the same way. Users can only *read* their own subscription row.

Accounts that exist when you run the SQL below stay **free forever**.
Until `LEMON_SQUEEZY_CHECKOUT_URL` is filled in `config.js`, payments are off and nobody is blocked.

### 1. Database
**SQL Editor**: run the updated [`supabase/schema.sql`](supabase/schema.sql) (safe to run again).
It adds the `subscriptions` table, starts a trial for every new sign-up and marks all existing accounts
as free forever.

### 2. Lemon Squeezy (in **Test mode** first)
1. Create the store, then **Products → New product**: name `SmartHost Monthly`, pricing
   **Subscription**, €5, every 1 month. Publish it.
2. Optional: in the product's **Confirmation modal**, set the button link to
   `https://nivancev-raf.github.io/guest-message-generator/?subscribed=1`
3. Copy the product's checkout link (**Share**), it looks like `https://YOUR-STORE.lemonsqueezy.com/buy/...`

### 3. Edge Function (Supabase)
1. **Edge Functions → Deploy a new function → Via Editor**, name it exactly `lemon-squeezy-webhook`,
   paste the contents of [`supabase/functions/lemon-squeezy-webhook/index.ts`](supabase/functions/lemon-squeezy-webhook/index.ts), deploy.
   (CLI alternative: `supabase functions deploy lemon-squeezy-webhook --no-verify-jwt`)
2. In the function's **Details / Settings**, turn **off** *Enforce JWT verification*
   (Lemon Squeezy cannot send a Supabase login; every call is checked with the signing secret instead).
3. Its URL is `https://YOUR-PROJECT.supabase.co/functions/v1/lemon-squeezy-webhook`

### 4. Connect the two
1. Lemon Squeezy **Settings → Webhooks → +**: the function URL above, a long random **Signing secret**,
   and the events `subscription_created`, `subscription_updated`, `subscription_cancelled`,
   `subscription_resumed`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`.
2. Supabase **Edge Functions → Secrets**: add
   - `LEMONSQUEEZY_WEBHOOK_SECRET` = the same signing secret
   - `LEMONSQUEEZY_TEST_MODE` = `true` (only while testing)

### 5. Test (on your computer, not on the live site)
1. In `config.js` set `LEMON_SQUEEZY_CHECKOUT_URL` to the **test** checkout link and
   `LEMON_SQUEEZY_PORTAL_URL` to `https://YOUR-STORE.lemonsqueezy.com/billing`.
   **Do not commit the test link**: anyone could "pay" with a test card. Run the app locally instead
   (`python -m http.server 8000`, open `http://localhost:8000/`).
2. Sign up with a test account, then end its trial in the **SQL Editor**:
   `update public.subscriptions set trial_ends_at = now() where user_id = (select id from auth.users where email = 'TEST@EMAIL');`
3. Tap Generate → Subscribe, pay with card `4242 4242 4242 4242`, any future date, any CVC.
   The app unlocks a few seconds later; Profile shows the plan. Lemon Squeezy → Webhooks shows each delivery.

### 6. Go live
1. Get the store approved (**Activate store**). Lemon Squeezy reviews a public website with a
   description, pricing, Terms / Privacy / Refund pages and a contact email.
2. Copy the product to live mode and create the webhook again **in live mode** (same URL and secret).
3. Put the **live** checkout link and the portal link in `config.js`, commit and deploy.
4. Delete the `LEMONSQUEEZY_TEST_MODE` secret, so test purchases can never unlock a real account.

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
├── supabase/functions/lemon-squeezy-webhook/index.ts  # Unlocks accounts when Lemon Squeezy reports a payment
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