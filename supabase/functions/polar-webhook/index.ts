// Polar -> Supabase: keeps public.subscriptions in sync with payments.
//
// Polar calls this URL whenever a subscription is created, renewed, canceled, uncanceled,
// revoked, goes past due, is paused or resumed. Each call carries the full subscription.
// The polar-checkout function creates every checkout with external_customer_id = the
// Supabase user id, so data.customer.external_id tells us whose subscription it is.
//
// Deploy with JWT verification OFF (Polar does not send a Supabase token); every request
// is verified with the webhook secret instead (Standard Webhooks signature).
//
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   POLAR_WEBHOOK_SECRET   the secret of the webhook endpoint in Polar
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { webhooks } from 'npm:@polar-sh/sdk@1.0.2/2026-10';

const WEBHOOK_SECRET = Deno.env.get('POLAR_WEBHOOK_SECRET') ?? '';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
type PolarSubscription = Record<string, any>;

// Polar's subscription -> the status words the app understands
// (active, on_trial, cancelled, past_due, expired, paused, unpaid)
function toAppState(sub: PolarSubscription): { status: string; renewsAt: string | null; endsAt: string | null } {
    const periodEnd: string | null = sub.current_period_end ?? null;
    switch (sub.status) {
        case 'active':
        case 'trialing':
            // Canceled by the customer, but paid until the end of the period
            if (sub.cancel_at_period_end || sub.ends_at) {
                return { status: 'cancelled', renewsAt: null, endsAt: sub.ends_at ?? periodEnd };
            }
            return { status: sub.status === 'trialing' ? 'on_trial' : 'active', renewsAt: periodEnd, endsAt: null };
        case 'past_due':
            return { status: 'past_due', renewsAt: periodEnd, endsAt: null };
        case 'paused':
            return { status: 'paused', renewsAt: null, endsAt: sub.ended_at ?? null };
        case 'unpaid':
            return { status: 'unpaid', renewsAt: null, endsAt: sub.ended_at ?? sub.ends_at ?? null };
        default: { // 'canceled'
            const endsAt: string | null = sub.ended_at ?? sub.ends_at ?? periodEnd;
            // Not ended yet: keeps access until the paid period is over
            if (!sub.ended_at && endsAt && new Date(endsAt) > new Date()) {
                return { status: 'cancelled', renewsAt: null, endsAt };
            }
            return { status: 'expired', renewsAt: null, endsAt };
        }
    }
}

// States that still let the user generate messages
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
        console.error('POLAR_WEBHOOK_SECRET is not set');
        return reply(500, 'Webhook secret missing');
    }

    const rawBody = await request.text();
    // deno-lint-ignore no-explicit-any
    let event: any;
    try {
        event = await webhooks.validateEvent(rawBody, {
            'webhook-id': request.headers.get('webhook-id') ?? '',
            'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
            'webhook-signature': request.headers.get('webhook-signature') ?? ''
        }, WEBHOOK_SECRET);
    } catch (error) {
        if (error instanceof webhooks.PolarWebhookVerificationError) return reply(403, 'Invalid signature');
        // A valid but unknown event type: acknowledge it so Polar does not retry
        if (error instanceof webhooks.PolarWebhookUnknownTypeError) return reply(200, 'Ignored unknown event');
        return reply(400, 'Invalid payload');
    }

    const eventType: string = event.type ?? '';
    if (!eventType.startsWith('subscription.')) return reply(200, `Ignored ${eventType}`);

    const sub: PolarSubscription = event.data ?? {};
    // Checkout not finished yet (first payment pending or failed): nothing changes
    if (sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
        return reply(200, `Ignored ${sub.status} subscription`);
    }
    const subscriptionId = String(sub.id ?? '');

    // Whose subscription: the Supabase user id we gave Polar, else the user who already has it
    let userId: string | undefined = sub.customer?.external_id ?? sub.metadata?.user_id;
    if (!userId || !UUID_PATTERN.test(userId)) {
        const { data: existingRow } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('provider_subscription_id', subscriptionId)
            .maybeSingle();
        userId = existingRow?.user_id;
    }
    if (!userId) {
        console.error(`No user for subscription ${subscriptionId} (${eventType})`);
        // 200 so Polar does not keep retrying an event we can never match
        return reply(200, 'No matching user');
    }

    const { data: current, error: readError } = await supabase
        .from('subscriptions')
        .select('provider_updated_at, provider_subscription_id, status, ends_at')
        .eq('user_id', userId)
        .maybeSingle();
    if (readError) {
        console.error('Reading subscription failed', readError);
        return reply(500, 'Database error');
    }

    const next = toAppState(sub);
    const updatedAt: string | null = sub.modified_at ?? sub.created_at ?? null;
    const sameSubscription = !current?.provider_subscription_id || current.provider_subscription_id === subscriptionId;

    // Webhooks can arrive out of order: keep the newest state
    if (sameSubscription && current?.provider_updated_at && updatedAt && new Date(updatedAt) < new Date(current.provider_updated_at)) {
        return reply(200, 'Ignored older event');
    }
    // A second subscription of the same user: an old, ended one must not replace the one that is running
    if (!sameSubscription && grantsAccess(current?.status, current?.ends_at) && !grantsAccess(next.status, next.endsAt)) {
        return reply(200, 'Ignored event of an older subscription');
    }

    const { error: writeError } = await supabase
        .from('subscriptions')
        .upsert({
            user_id: userId,
            status: next.status,
            renews_at: next.renewsAt,
            ends_at: next.endsAt,
            provider_subscription_id: subscriptionId,
            provider_customer_id: sub.customer_id != null ? String(sub.customer_id) : null,
            provider_updated_at: updatedAt
        }, { onConflict: 'user_id' });
    if (writeError) {
        console.error('Saving subscription failed', writeError);
        return reply(500, 'Database error');
    }

    console.log(`${eventType}: user ${userId} -> ${next.status}`);
    return reply(200, 'OK');
});
