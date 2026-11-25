// App -> Polar: opens the payment page (checkout) or the subscription management page
// (customer portal) for the logged-in user.
//
// The Polar access token must never be in the app, so the app asks this function:
//   POST { "action": "checkout" | "portal", "returnUrl": "<app url>" }
//   with the user's Supabase login (supabase.functions.invoke sends it)  ->  { "url": "..." }
// The user is taken from the login, never from the request body, so nobody can pay
// "for" another account or open someone else's portal.
//
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   POLAR_ACCESS_TOKEN   Organization Access Token (scopes: checkouts:write, customer_sessions:write)
//   POLAR_PRODUCT_ID     ID of the "SmartHost Monthly" product
//   POLAR_SERVER         "sandbox" while testing, "production" when live
//   APP_URL              optional, default https://nivancev-raf.github.io/guest-message-generator/
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createPolar } from 'npm:@polar-sh/sdk@1.0.2/2026-10';

const APP_URL = Deno.env.get('APP_URL') ?? 'https://nivancev-raf.github.io/guest-message-generator/';
const PRODUCT_ID = Deno.env.get('POLAR_PRODUCT_ID') ?? '';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
);

const polar = createPolar({
    accessToken: Deno.env.get('POLAR_ACCESS_TOKEN') ?? '',
    environment: Deno.env.get('POLAR_SERVER') === 'production' ? 'production' : 'sandbox'
});

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function reply(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

// Only send people back to the app itself (or a local copy while testing)
function safeReturnUrl(value: unknown): string {
    if (typeof value !== 'string') return APP_URL;
    try {
        const url = new URL(value);
        const isApp = value.startsWith(APP_URL);
        const isLocal = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
        return isApp || isLocal ? `${url.origin}${url.pathname}` : APP_URL;
    } catch {
        return APP_URL;
    }
}

function withParam(url: string, name: string, value: string): string {
    const result = new URL(url);
    result.searchParams.set(name, value);
    return result.toString();
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

    // Who is asking: the Supabase login in the Authorization header
    const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    const user = auth?.user;
    if (authError || !user) return reply(401, { error: 'Not logged in' });

    let body: Record<string, unknown> = {};
    try {
        body = await request.json();
    } catch {
        // empty body: defaults below
    }
    const returnUrl = safeReturnUrl(body.returnUrl);

    try {
        if (body.action === 'portal') {
            const session = await polar.customerSessions.create({
                external_customer_id: user.id,
                return_url: returnUrl
            });
            return reply(200, { url: session.customer_portal_url });
        }

        if (!PRODUCT_ID) {
            console.error('POLAR_PRODUCT_ID is not set');
            return reply(500, { error: 'Payments are not configured' });
        }

        // Already paying: no second subscription, send them to the portal instead
        const { data: row } = await supabase
            .from('subscriptions')
            .select('status, ends_at')
            .eq('user_id', user.id)
            .maybeSingle();
        const stillRunning = row && (['active', 'on_trial', 'past_due'].includes(row.status) ||
            (row.status === 'cancelled' && row.ends_at && new Date(row.ends_at) > new Date()));
        if (stillRunning) return reply(409, { error: 'already_subscribed' });

        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();

        const checkoutRequest = {
            products: [PRODUCT_ID],
            external_customer_id: user.id,
            customer_email: user.email ?? null,
            customer_name: profile?.display_name ?? null,
            metadata: { user_id: user.id },
            success_url: withParam(returnUrl, 'subscribed', '1'),
            return_url: returnUrl
        };
        let checkout;
        try {
            checkout = await polar.checkouts.create(checkoutRequest);
        } catch (error) {
            // Polar only accepts emails that can receive mail. If it rejects the account's
            // email, open the checkout without it; the buyer types one on the payment page.
            // deno-lint-ignore no-explicit-any
            const rejectedEmail = (error as any)?.statusCode === 422 && JSON.stringify((error as any)?.error ?? '').includes('customer_email');
            if (!rejectedEmail) throw error;
            console.warn(`Polar rejected the email of user ${user.id}; opening the checkout without it`);
            checkout = await polar.checkouts.create({ ...checkoutRequest, customer_email: null });
        }
        return reply(200, { url: checkout.url });
    } catch (error) {
        // deno-lint-ignore no-explicit-any
        const status = (error as any)?.statusCode;
        console.error(`Polar request failed (${body.action ?? 'checkout'})`, status, error);
        // The portal needs a Polar customer, which only exists after the first checkout
        if (body.action === 'portal' && status === 404) return reply(404, { error: 'no_customer' });
        return reply(502, { error: 'Polar request failed' });
    }
});
