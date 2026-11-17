// Lemon Squeezy -> Supabase: keeps public.subscriptions in sync with payments.
//
// Lemon Squeezy calls this URL whenever a subscription is created, renewed, cancelled,
// resumed, paused or expires. The app passes the user's id into the checkout
// (checkout[custom][user_id]), and Lemon Squeezy sends it back in meta.custom_data.
//
// Deploy with JWT verification OFF (Lemon Squeezy does not send a Supabase token);
// every request is verified with the webhook signing secret instead.
//
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   LEMONSQUEEZY_WEBHOOK_SECRET  the "Signing secret" of the webhook in Lemon Squeezy
//   LEMONSQUEEZY_TEST_MODE       "true" while testing with test cards; remove it when you go live,
//                                so test purchases can never unlock a real account
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '';
const ACCEPT_TEST_MODE = Deno.env.get('LEMONSQUEEZY_TEST_MODE') === 'true';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return difference === 0;
}

// Statuses that still let the user generate messages
function grantsAccess(status: string | null | undefined, endsAt: string | null | undefined): boolean {
    if (status === 'active' || status === 'on_trial' || status === 'past_due') return true;
    return status === 'cancelled' && !!endsAt && new Date(endsAt) > new Date();
}

function reply(status: number, message: string): Response {
    return new Response(JSON.stringify({ message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

Deno.serve(async (request) => {
    if (request.method !== 'POST') return reply(405, 'Method not allowed');
    if (!WEBHOOK_SECRET) {
        console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not set');
        return reply(500, 'Webhook secret missing');
    }

    const rawBody = await request.text();
    const expected = await hmacSha256Hex(WEBHOOK_SECRET, rawBody);
    const received = (request.headers.get('X-Signature') ?? '').toLowerCase();
    if (!constantTimeEqual(expected, received)) return reply(401, 'Invalid signature');

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return reply(400, 'Invalid JSON');
    }

    const meta = payload.meta ?? {};
    const data = payload.data ?? {};
    const eventName: string = meta.event_name ?? '';

    // Only subscription objects carry the state we store (payment events are covered
    // by the subscription_updated event Lemon Squeezy sends with every renewal)
    if (!eventName.startsWith('subscription_') || data.type !== 'subscriptions') {
        return reply(200, `Ignored ${eventName}`);
    }
    if (meta.test_mode && !ACCEPT_TEST_MODE) {
        return reply(200, 'Ignored test mode event');
    }

    const attributes = data.attributes ?? {};
    const subscriptionId = String(data.id ?? '');

    // Which user: the id passed into the checkout, else the user who already has this subscription
    let userId: string | undefined = meta.custom_data?.user_id;
    if (!userId || !UUID_PATTERN.test(userId)) {
        const { data: existingRow } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('ls_subscription_id', subscriptionId)
            .maybeSingle();
        userId = existingRow?.user_id;
    }
    if (!userId) {
        console.error(`No user for subscription ${subscriptionId} (${eventName})`);
        // 200 so Lemon Squeezy does not keep retrying an event we can never match
        return reply(200, 'No matching user');
    }

    // Webhooks can arrive out of order: keep the newest state
    const { data: current, error: readError } = await supabase
        .from('subscriptions')
        .select('ls_updated_at, ls_subscription_id, status, ends_at')
        .eq('user_id', userId)
        .maybeSingle();
    if (readError) {
        console.error('Reading subscription failed', readError);
        return reply(500, 'Database error');
    }
    const updatedAt: string | null = attributes.updated_at ?? null;
    const sameSubscription = !current?.ls_subscription_id || current.ls_subscription_id === subscriptionId;
    if (sameSubscription && current?.ls_updated_at && updatedAt && new Date(updatedAt) < new Date(current.ls_updated_at)) {
        return reply(200, 'Ignored older event');
    }
    // A second subscription of the same user: an old, ended one must not replace the one that is running
    if (!sameSubscription && grantsAccess(current?.status, current?.ends_at) && !grantsAccess(attributes.status, attributes.ends_at)) {
        return reply(200, 'Ignored event of an older subscription');
    }

    const { error: writeError } = await supabase
        .from('subscriptions')
        .upsert({
            user_id: userId,
            status: attributes.status ?? null,
            renews_at: attributes.renews_at ?? null,
            ends_at: attributes.ends_at ?? null,
            card_brand: attributes.card_brand ?? null,
            card_last_four: attributes.card_last_four ?? null,
            ls_subscription_id: subscriptionId,
            ls_customer_id: attributes.customer_id != null ? String(attributes.customer_id) : null,
            ls_updated_at: updatedAt
        }, { onConflict: 'user_id' });
    if (writeError) {
        console.error('Saving subscription failed', writeError);
        return reply(500, 'Database error');
    }

    console.log(`${eventName}: user ${userId} -> ${attributes.status}`);
    return reply(200, 'OK');
});
