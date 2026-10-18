// Navigation: bottom tab bar, per-screen top bars, animated views and toasts
//
// Every view is an absolutely positioned layer with its own scroll container and top bar.
// Root views (one per tab) crossfade; sub-screens (with `back`) slide in on top of their parent.

// tab: tab highlighted while the view is shown
// back: parent view for sub-screens (shows the back button instead of the logo)
const VIEWS = {
    generator: { element: 'viewGenerator', tab: 'generator', title: 'New message' },
    generated: { element: 'viewGenerated', tab: 'generator', title: 'Ready to send', back: 'generator' },
    apartments: { element: 'viewApartments', tab: 'apartments', title: 'Apartments' },
    apartmentForm: { element: 'viewApartmentForm', tab: 'apartments', title: 'Edit apartment', kicker: 'APARTMENTS', back: 'apartments' },
    messages: { element: 'viewMessages', tab: 'messages', title: 'Templates' },
    profile: { element: 'viewProfile', tab: 'profile', title: 'Profile' }
};

const TAB_ORDER = ['generator', 'apartments', 'messages', 'profile'];

// Motion timings (ms), matching the design handoff
const MOTION = { push: 420, pop: 440, toast: 1800 };

// Check mark used in inline success messages
const CHECK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

let currentView = 'generator';
let unmountTimer = null;
let toastTimer = null;

// Called when a view is shown ({ enter }) or left ({ canLeave } returns false to stay)
const viewHooks = {};

function registerViewHooks(name, hooks) {
    viewHooks[name] = hooks;
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Duration scaled to 0 when the user asked for reduced motion
function motionDelay(ms) {
    return prefersReducedMotion() ? 0 : ms;
}

function viewElement(name) {
    return document.getElementById(VIEWS[name].element);
}

// Change the top bar title / kicker of a view (the current one by default)
function setTopbar(title, kicker, viewName = currentView) {
    const element = viewElement(viewName);
    if (title !== undefined) element.querySelector('.topbar-title').textContent = title;
    if (kicker !== undefined) element.querySelector('.topbar .kicker').textContent = kicker;
}

// Mount a view off-screen first, then move it on the next frame so the transition runs
function nextFrame(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
}

function setMotionMode(mode) {
    document.getElementById('appViewport').dataset.motion = mode;
}

function setScrim(on) {
    document.getElementById('viewScrim').classList.toggle('is-on', on);
}

// Remove a sub-screen without animating it
function clearSubView(name) {
    const element = viewElement(name);
    element.classList.add('no-transition');
    element.classList.remove('is-entered', 'is-mounted');
    element.offsetWidth; // apply the instant change before transitions come back
    element.classList.remove('no-transition');
    viewElement(VIEWS[name].back).classList.remove('is-covered');
    setScrim(false);
}

function pushView(name) {
    const element = viewElement(name);
    const parent = viewElement(VIEWS[name].back);
    clearTimeout(unmountTimer);
    setMotionMode('push');
    element.scrollTop = 0;
    element.classList.add('is-mounted');
    nextFrame(() => {
        element.classList.add('is-entered');
        parent.classList.add('is-covered');
        setScrim(true);
    });
}

function popView(name) {
    const element = viewElement(name);
    const parent = viewElement(VIEWS[name].back);
    setMotionMode('push');
    element.classList.remove('is-entered');
    parent.classList.remove('is-covered');
    setScrim(false);
    clearTimeout(unmountTimer);
    unmountTimer = setTimeout(() => element.classList.remove('is-mounted'), motionDelay(MOTION.pop));
}

function switchTab(fromRoot, toRoot) {
    setMotionMode('tab');
    viewElement(toRoot).scrollTop = 0;
    viewElement(fromRoot).classList.remove('is-active', 'is-covered');
    viewElement(toRoot).classList.add('is-active');
}

// Sliding gold pill behind the active tab icon
function updateTabbar(activeTab) {
    const index = TAB_ORDER.indexOf(activeTab);
    document.getElementById('tabPill').style.setProperty('--tab-index', index);
    document.querySelectorAll('.tabbar .tab').forEach(tab => {
        const active = tab.dataset.tab === activeTab;
        tab.classList.toggle('active', active);
        if (active) {
            tab.setAttribute('aria-current', 'page');
        } else {
            tab.removeAttribute('aria-current');
        }
    });
}

// Show a view; returns false when the current view refused to be left (unsaved changes)
function showView(name, options = {}) {
    const leaving = viewHooks[currentView];
    if (!options.force && name !== currentView && leaving && leaving.canLeave && !leaving.canLeave()) {
        return false;
    }

    const view = VIEWS[name];
    const previous = currentView;
    currentView = name;
    document.getElementById('appScreen').dataset.view = name;
    setTopbar(view.title, view.kicker || 'SMARTHOST', name);

    if (name !== previous) {
        if (view.back === previous) {
            pushView(name);
        } else if (VIEWS[previous].back === name) {
            popView(previous);
        } else {
            // Switching tabs clears any open sub-screen
            const fromRoot = VIEWS[previous].back || previous;
            if (VIEWS[previous].back) clearSubView(previous);
            const toRoot = view.back || name;
            if (fromRoot !== toRoot) switchTab(fromRoot, toRoot);
            if (view.back) pushView(name);
        }
    }

    updateTabbar(view.tab);

    const entering = viewHooks[name];
    if (entering && entering.enter) entering.enter(options);
    return true;
}

// Dark pill above the tab bar, e.g. "Copied to clipboard"
function showToast(message, delay = 0) {
    setTimeout(() => {
        const toast = document.getElementById('toast');
        document.getElementById('toastText').textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-visible'), MOTION.toast);
    }, motionDelay(delay));
}

// Stop the rubber-band bounce when pulling past the top (or bottom) of a screen.
// CSS overscroll-behavior covers new browsers; this covers older iOS versions.
function preventOverscroll() {
    const viewport = document.getElementById('appViewport');
    let startY = 0;
    viewport.addEventListener('touchstart', event => {
        startY = event.touches[0].clientY;
    }, { passive: true });
    viewport.addEventListener('touchmove', event => {
        const scroller = event.target.closest('textarea, .view');
        if (!scroller) return;
        const pullingDown = event.touches[0].clientY > startY;
        const atTop = scroller.scrollTop <= 0;
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
        if ((pullingDown && atTop) || (!pullingDown && atBottom)) {
            // A textarea at its edge hands the gesture to its screen
            const view = scroller.closest('.view');
            if (scroller !== view && view) {
                const viewAtTop = view.scrollTop <= 0;
                const viewAtBottom = view.scrollTop + view.clientHeight >= view.scrollHeight - 1;
                if (!((pullingDown && viewAtTop) || (!pullingDown && viewAtBottom))) return;
            }
            event.preventDefault();
        }
    }, { passive: false });
}

function initMenu() {
    preventOverscroll();

    document.querySelectorAll('.tabbar .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Tapping the active tab while a sub-screen is open pops back to its root
            const back = VIEWS[currentView].back;
            if (tab.dataset.tab === VIEWS[currentView].tab && back) {
                showView(back);
            } else {
                showView(tab.dataset.tab);
            }
        });
    });

    document.querySelectorAll('.topbar-back').forEach(button => {
        button.addEventListener('click', () => {
            const back = VIEWS[currentView].back;
            if (back) showView(back);
        });
    });
    document.getElementById('topbarAvatar').addEventListener('click', () => showView('profile'));
    document.getElementById('topbarAdd').addEventListener('click', () => openApartmentForm());

    // Initial state: Generate tab, no transition
    viewElement('generator').classList.add('is-active');
    updateTabbar('generator');
}
