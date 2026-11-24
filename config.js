// Supabase project configuration
// SUPABASE_ANON_KEY holds the Publishable key (sb_publishable_...) or the legacy anon key.
// The URL and this key are safe to publish: they only identify the project.
// Access to data is protected by login + Row Level Security policies (supabase/schema.sql).
const SUPABASE_URL = 'https://jcwgqflphmbvhvfpzuqi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2Rf5PCPV6EAqaxzcpePYEw_tyS7t3e2';

// Payments (Polar). The payment page and the subscription page are opened by the
// polar-checkout Edge Function, which holds the Polar keys; nothing secret goes here.
// false: payments are off, nobody is blocked after the trial and no trial banner shows.
const PAYMENTS_ENABLED = false;
const PLAN_NAME = 'SmartHost Monthly';
const PLAN_PRICE = '€5';
const TRIAL_DAYS = 7;
