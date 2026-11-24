// Free trial + monthly subscription (Polar)
//
// The state comes from public.subscriptions, which only the polar-webhook Edge Function
// can change. The app only reads it, shows the trial banner / Plan card, and opens the
// paywall sheet when someone without access taps Generate. The payment page and the
// subscription page come from the polar-checkout Edge Function (it holds the Polar keys).

let currentSubscription = null; // row of public.subscriptions; null = not loaded / no payments
let paymentPollTimer = null;
let paymentPollUntil = 0;
let paywallReturnFocus = null;
let openingPolarPage = false;

const DAY_MS = 24 * 60 * 60 * 1000;
const PAYMENT_POLL_MS = 4000;
const PAYMENT_POLL_WINDOW_MS = 10 * 60 * 1000;

// After paying, Polar sends people back to the app with ?subscribed=1
const returnedFromCheckout = new URLSearchParams(window.location.search).has('subscribed');

function paymentsEnabled() {
    return PAYMENTS_ENABLED === true;
}

// 'none'        payments off, or the state could not be loaded: nobody is blocked
// 'free'        account from before payments existed
// 'trial'       inside the free trial
// 'trial_ended' trial over, never subscribed
// 'active'      paying
// 'cancelled'   cancelled, but the paid month is not over yet
// 'past_due'    a renewal payment failed; Polar retries it
// 'expired'     had a subscription that ended (expired, unpaid, paused or cancelled and over)
function getPlanState() {
    const sub = currentSubscription;
    if (!paymentsEnabled() || !sub) return 'none';
    if (sub.free_forever) return 'free';

    const now = Date.now();
    if (sub.status === 'active' || sub.status === 'on_trial') return 'active';
    if (sub.status === 'past_due') return 'past_due';
    if (sub.status === 'cancelled' && sub.ends_at && new Date(sub.ends_at).getTime() > now) return 'cancelled';
    if (new Date(sub.trial_ends_at).getTime() > now) return 'trial';
    return sub.status ? 'expired' : 'trial_ended';
}

function hasGenerateAccess() {
    const state = getPlanState();
    return state !== 'trial_ended' && state !== 'expired';
}

function trialInfo() {
    const end = new Date(currentSubscription.trial_ends_at);
    const start = new Date(end.getTime() - TRIAL_DAYS * DAY_MS);
    const remaining = end.getTime() - Date.now();
    return {
        start,
        end,
        daysLeft: Math.max(0, Math.ceil(remaining / DAY_MS)),
        progress: Math.min(1, Math.max(0, 1 - remaining / (TRIAL_DAYS * DAY_MS)))
    };
}

function formatShortDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatLongDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCard(sub) {
    if (!sub.card_last_four) return '';
    const brand = (sub.card_brand || 'Card')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    return `${brand} •••• ${sub.card_last_four}`;
}

function daysLeftText(daysLeft) {
    return daysLeft <= 1 ? 'Last day of your trial' : `${daysLeft} days left`;
}

// --- Loading ---

async function loadSubscription() {
    if (!paymentsEnabled() || !currentUser) {
        currentSubscription = null;
        return;
    }
    try {
        currentSubscription = await fetchSubscription(currentUser.id);
    } catch (error) {
        // Keep the last known state on a failed refresh. Never loaded (table missing,
        // offline at start): nobody is locked out because of it.
        console.error('Loading the subscription failed', error);
    }
}

async function refreshSubscription() {
    await loadSubscription();
    renderSubscriptionUI();
}

// --- Rendering ---

function renderSubscriptionUI() {
    renderTrialBanner();
    renderPlanCard();
}

function setBadge(element, text, tone) {
    element.textContent = text;
    element.className = `badge${tone ? ` badge-${tone}` : ''}`;
}

// A1: banner on the Generate screen
function renderTrialBanner() {
    const banner = document.getElementById('trialBanner');
    const state = getPlanState();
    const kicker = document.getElementById('trialBannerKicker');
    const title = document.getElementById('trialBannerTitle');
    const note = document.getElementById('trialBannerNote');
    const button = document.getElementById('trialBannerBtn');
    const fill = document.getElementById('trialBannerFill');

    banner.classList.remove('is-warning');
    banner.hidden = !['trial', 'trial_ended', 'expired', 'past_due'].includes(state);
    if (banner.hidden) return;

    button.textContent = 'Subscribe';
    button.dataset.action = 'checkout';
    fill.parentElement.hidden = false;

    if (state === 'trial') {
        const trial = trialInfo();
        kicker.textContent = 'Free trial';
        title.textContent = daysLeftText(trial.daysLeft);
        fill.style.width = `${Math.round(trial.progress * 100)}%`;
        note.textContent = `Then ${PLAN_PRICE} / month. Cancel anytime.`;
    } else if (state === 'past_due') {
        banner.classList.add('is-warning');
        kicker.textContent = 'Payment failed';
        title.textContent = 'Update your card';
        fill.parentElement.hidden = true;
        note.textContent = 'We will retry the payment. Update your card to keep generating messages.';
        button.textContent = 'Update';
        button.dataset.action = 'portal';
        button.hidden = false;
        return;
    } else {
        banner.classList.add('is-warning');
        kicker.textContent = state === 'expired' ? 'Subscription' : 'Free trial';
        title.textContent = state === 'expired' ? 'Your subscription has ended' : 'Your free trial has ended';
        fill.style.width = '100%';
        note.textContent = `Subscribe for ${PLAN_PRICE} / month to keep generating messages.`;
    }
    button.hidden = false;
}

function addPlanRow(container, label, value, strongValue) {
    const row = document.createElement('div');
    row.className = 'plan-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'plan-row-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);
    const valueEl = document.createElement('span');
    valueEl.className = 'plan-row-value';
    if (strongValue) {
        const strong = document.createElement('strong');
        strong.textContent = strongValue;
        valueEl.appendChild(strong);
    }
    valueEl.appendChild(document.createTextNode(value));
    row.appendChild(valueEl);
    container.appendChild(row);
}

// B1 / B2: Plan card in Profile
function renderPlanCard() {
    const section = document.getElementById('planSection');
    const state = getPlanState();
    section.hidden = state === 'none';
    if (section.hidden) return;

    const sub = currentSubscription;
    const title = document.getElementById('planTitle');
    const badge = document.getElementById('planBadge');
    const progress = document.getElementById('planProgress');
    const rows = document.getElementById('planRows');
    const button = document.getElementById('planActionBtn');
    const note = document.getElementById('planNote');

    rows.innerHTML = '';
    progress.hidden = true;
    button.hidden = false;
    note.textContent = '';

    const showProgress = (fillPercent, startLabel, endLabel) => {
        progress.hidden = false;
        document.getElementById('planFill').style.width = `${fillPercent}%`;
        document.getElementById('planStart').textContent = startLabel;
        document.getElementById('planEnd').textContent = endLabel;
    };
    const setButton = (label, action, style) => {
        button.textContent = label;
        button.dataset.action = action;
        button.className = `btn btn-medium ${style === 'outline' ? 'btn-outline' : 'btn-primary'}`;
    };
    const price = () => addPlanRow(rows, 'Price', ' / month', PLAN_PRICE);

    switch (state) {
        case 'free':
            title.textContent = 'Early access';
            setBadge(badge, 'Free forever', 'success');
            button.hidden = true;
            note.textContent = 'Your account was created before subscriptions existed, so it stays free.';
            break;
        case 'trial': {
            const trial = trialInfo();
            title.textContent = 'Free trial';
            setBadge(badge, trial.daysLeft <= 1 ? 'Last day' : `${trial.daysLeft} days left`);
            showProgress(Math.round(trial.progress * 100), `Started ${formatShortDate(trial.start)}`, `Ends ${formatShortDate(trial.end)}`);
            addPlanRow(rows, 'After the trial', ' / month', PLAN_PRICE);
            setButton('Subscribe now', 'checkout');
            note.textContent = 'Cancel anytime.';
            break;
        }
        case 'trial_ended': {
            const trial = trialInfo();
            title.textContent = 'Free trial';
            setBadge(badge, 'Ended', 'danger');
            showProgress(100, `Started ${formatShortDate(trial.start)}`, `Ended ${formatShortDate(trial.end)}`);
            price();
            setButton('Subscribe now', 'checkout');
            note.textContent = 'Your apartments and templates stay saved. Cancel anytime.';
            break;
        }
        case 'active':
            title.textContent = PLAN_NAME;
            setBadge(badge, 'Active', 'success');
            price();
            if (sub.renews_at) addPlanRow(rows, 'Next payment', formatLongDate(sub.renews_at));
            if (formatCard(sub)) addPlanRow(rows, 'Payment method', formatCard(sub));
            setButton('Manage subscription', 'portal', 'outline');
            note.textContent = 'Change card, download invoices or cancel';
            break;
        case 'cancelled':
            title.textContent = PLAN_NAME;
            setBadge(badge, 'Cancelled', 'neutral');
            price();
            addPlanRow(rows, 'Access until', formatLongDate(sub.ends_at));
            setButton('Manage subscription', 'portal', 'outline');
            note.textContent = 'Changed your mind? You can resume it in Manage subscription.';
            break;
        case 'past_due':
            title.textContent = PLAN_NAME;
            setBadge(badge, 'Payment failed', 'danger');
            price();
            if (formatCard(sub)) addPlanRow(rows, 'Payment method', formatCard(sub));
            setButton('Update card', 'portal');
            note.textContent = 'We will retry the payment. Update your card to keep access.';
            break;
        case 'expired':
            title.textContent = PLAN_NAME;
            setBadge(badge, sub.status === 'paused' ? 'Paused' : 'Ended', 'danger');
            price();
            setButton('Subscribe again', 'checkout');
            note.textContent = 'Your apartments and templates stay saved.';
            break;
    }
    document.getElementById('planDivider').hidden = rows.childElementCount === 0;
}

// --- A2: paywall sheet ---

function openPaywall() {
    const expired = getPlanState() === 'expired';
    document.getElementById('paywallTitle').textContent = expired ? 'Your subscription has ended' : 'Your free trial has ended';
    document.getElementById('paywallText').textContent = expired
        ? 'Subscribe again to keep generating and sending guest messages.'
        : 'Subscribe to keep generating and sending guest messages.';

    paywallReturnFocus = document.activeElement;
    document.getElementById('paywallBackdrop').classList.add('is-open');
    const sheet = document.getElementById('paywallSheet');
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('paywallSubscribeBtn').focus({ preventScroll: true }), motionDelay(80));
}

function closePaywall() {
    const sheet = document.getElementById('paywallSheet');
    if (!sheet.classList.contains('is-open')) return;
    document.getElementById('paywallBackdrop').classList.remove('is-open');
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    if (paywallReturnFocus && paywallReturnFocus.focus) paywallReturnFocus.focus({ preventScroll: true });
}

// --- Polar pages (links come from the polar-checkout Edge Function) ---

function isStandaloneApp() {
    return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

// Error code the function sent back ('already_subscribed', 'no_customer', ...)
async function polarErrorCode(error) {
    try {
        const body = await error.context.json();
        return body && body.error;
    } catch {
        return null;
    }
}

// The link arrives from the server a moment after the tap. Browsers only allow a new tab
// during the tap itself, so open it right away and send it to the link when it arrives.
// The home screen app goes there in place: Polar brings it back to the app afterwards.
async function openPolarPage(action, button) {
    if (!paymentsEnabled() || !currentUser || openingPolarPage) return;
    openingPolarPage = true;
    const label = button ? button.textContent : '';
    if (button) {
        button.disabled = true;
        button.textContent = 'Opening…';
    }
    const tab = isStandaloneApp() ? null : window.open('', '_blank');

    try {
        const { data, error } = await supabaseClient.functions.invoke('polar-checkout', {
            body: { action, returnUrl: APP_URL }
        });
        if (error) throw error;
        if (!data || !data.url) throw new Error('No link in the answer');
        if (tab && !tab.closed) {
            tab.opener = null;
            tab.location.href = data.url;
        } else {
            window.location.href = data.url;
        }
        // Paying, cancelling or changing the card comes back through the webhook
        awaitPayment();
    } catch (error) {
        if (tab) tab.close();
        console.error(`Opening the Polar ${action} page failed`, error);
        const code = await polarErrorCode(error);
        if (code === 'already_subscribed') {
            closePaywall();
            await refreshSubscription();
            showToast('You already have a subscription');
        } else if (code === 'no_customer') {
            showToast('No subscription to manage yet');
        } else {
            showToast('Could not open it. Try again.');
        }
    } finally {
        openingPolarPage = false;
        if (button) {
            button.disabled = false;
            button.textContent = label;
        }
    }
}

function startCheckout(event) {
    openPolarPage('checkout', event && event.currentTarget);
}

function openBillingPortal(event) {
    openPolarPage('portal', event && event.currentTarget);
}

function handleSubscriptionAction(event) {
    if (event.currentTarget.dataset.action === 'portal') {
        openBillingPortal(event);
    } else {
        startCheckout(event);
    }
}

// --- Waiting for the webhook after checkout ---

// Check every few seconds (while the app is visible) until the payment shows up
function awaitPayment() {
    paymentPollUntil = Date.now() + PAYMENT_POLL_WINDOW_MS;
    schedulePaymentPoll(0);
}

function schedulePaymentPoll(delay) {
    clearTimeout(paymentPollTimer);
    paymentPollTimer = setTimeout(pollPayment, delay);
}

function stopPaymentPoll() {
    clearTimeout(paymentPollTimer);
    paymentPollUntil = 0;
}

async function pollPayment() {
    if (!currentUser || Date.now() > paymentPollUntil) return stopPaymentPoll();
    if (document.visibilityState !== 'visible') return; // resumes on visibilitychange

    const before = getPlanState();
    const beforeKey = JSON.stringify(currentSubscription);
    await refreshSubscription();
    const after = getPlanState();

    if (after === 'active' && before !== 'active') {
        stopPaymentPoll();
        closePaywall();
        showToast('Subscription active – thank you!');
        return;
    }
    // Changes made in the portal (card, cancel, resume): stop once something changed
    if (before === 'active' || before === 'cancelled' || before === 'past_due') {
        if (JSON.stringify(currentSubscription) !== beforeKey) return stopPaymentPoll();
    }
    schedulePaymentPoll(PAYMENT_POLL_MS);
}

function handleSubscriptionVisibility() {
    if (document.visibilityState !== 'visible' || !currentUser || !paymentsEnabled()) return;
    if (paymentPollUntil && Date.now() < paymentPollUntil) {
        schedulePaymentPoll(0);
    } else {
        // Trial days and renewals move on while the app sits in the background
        refreshSubscription();
    }
}

// Called once the user's data is loaded
function afterSubscriptionLoaded() {
    renderSubscriptionUI();
    if (returnedFromCheckout && window.location.search) {
        history.replaceState(null, '', APP_URL);
        if (getPlanState() !== 'active') awaitPayment();
    }
}

function resetSubscriptionState() {
    stopPaymentPoll();
    closePaywall();
    currentSubscription = null;
    renderSubscriptionUI();
}

function initSubscription() {
    document.getElementById('trialBannerBtn').addEventListener('click', handleSubscriptionAction);
    document.getElementById('planActionBtn').addEventListener('click', handleSubscriptionAction);
    document.getElementById('paywallSubscribeBtn').addEventListener('click', startCheckout);
    document.getElementById('paywallCloseBtn').addEventListener('click', closePaywall);
    document.getElementById('paywallBackdrop').addEventListener('click', closePaywall);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closePaywall();
    });
    document.addEventListener('visibilitychange', handleSubscriptionVisibility);
    // Plan name and price come from config.js
    document.getElementById('paywallPlanName').textContent = PLAN_NAME;
    document.getElementById('paywallPrice').textContent = PLAN_PRICE;
    document.getElementById('paywallSubscribeBtn').textContent = `Subscribe · ${PLAN_PRICE} / month`;
    renderSubscriptionUI();
}
