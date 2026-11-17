// Supabase project configuration
// SUPABASE_ANON_KEY holds the Publishable key (sb_publishable_...) or the legacy anon key.
// The URL and this key are safe to publish: they only identify the project.
// Access to data is protected by login + Row Level Security policies (supabase/schema.sql).
const SUPABASE_URL = 'https://jcwgqflphmbvhvfpzuqi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2Rf5PCPV6EAqaxzcpePYEw_tyS7t3e2';

// Payments (Lemon Squeezy). Both links are public by design: they only open Lemon Squeezy pages.
// Checkout: Lemon Squeezy -> Products -> your product -> Share -> copy the checkout link
//   (looks like https://YOUR-STORE.lemonsqueezy.com/buy/xxxxxxxx-xxxx-...)
// Portal: https://YOUR-STORE.lemonsqueezy.com/billing (customers manage card, invoices, cancel)
// Leave the checkout link empty to hide payments: then nobody is blocked after the trial.
const LEMON_SQUEEZY_CHECKOUT_URL = '';
const LEMON_SQUEEZY_PORTAL_URL = '';
const PLAN_NAME = 'SmartHost Monthly';
const PLAN_PRICE = '€5';
const TRIAL_DAYS = 7;
