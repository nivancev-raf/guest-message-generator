// Navigation: bottom tab bar, top bar and views

// tab: tab highlighted while the view is shown
// back: parent view for sub-screens (shows the back button instead of the logo)
const VIEWS = {
    generator: { element: 'viewGenerator', tab: 'generator', title: 'New message', action: 'avatar' },
    generated: { element: 'viewGenerated', tab: 'generator', title: 'Ready to send', back: 'generator' },
    apartments: { element: 'viewApartments', tab: 'apartments', title: 'Apartments', action: 'add' },
    apartmentForm: { element: 'viewApartmentForm', tab: 'apartments', title: 'Edit apartment', kicker: 'APARTMENTS', back: 'apartments' },
    messages: { element: 'viewMessages', tab: 'messages', title: 'Templates' },
    profile: { element: 'viewProfile', tab: 'profile', title: 'Profile' }
};

// Check mark used in inline success messages
const CHECK_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

let currentView = 'generator';

// Called when a view is shown ({ enter }) or left ({ canLeave } returns false to stay)
const viewHooks = {};

function registerViewHooks(name, hooks) {
    viewHooks[name] = hooks;
}

// Change the top bar title / kicker of the current view (e.g. "Add apartment")
function setTopbar(title, kicker) {
    if (title !== undefined) document.getElementById('topbarTitle').textContent = title;
    if (kicker !== undefined) document.getElementById('topbarKicker').textContent = kicker;
}

// Show a view; returns false when the current view refused to be left (unsaved changes)
function showView(name, options = {}) {
    const leaving = viewHooks[currentView];
    if (!options.force && name !== currentView && leaving && leaving.canLeave && !leaving.canLeave()) {
        return false;
    }

    const view = VIEWS[name];
    Object.entries(VIEWS).forEach(([viewName, config]) => {
        document.getElementById(config.element).style.display = viewName === name ? 'block' : 'none';
    });
    currentView = name;

    // Top bar
    document.getElementById('topbarLogo').style.display = view.back ? 'none' : 'block';
    document.getElementById('topbarBack').style.display = view.back ? 'flex' : 'none';
    document.getElementById('topbarAvatar').style.display = view.action === 'avatar' ? 'flex' : 'none';
    document.getElementById('topbarAdd').style.display = view.action === 'add' ? 'flex' : 'none';
    setTopbar(view.title, view.kicker || 'SMARTHOST');

    // Tab bar
    document.querySelectorAll('.tabbar .tab').forEach(tab => {
        const active = tab.dataset.tab === view.tab;
        tab.classList.toggle('active', active);
        if (active) {
            tab.setAttribute('aria-current', 'page');
        } else {
            tab.removeAttribute('aria-current');
        }
    });

    const entering = viewHooks[name];
    if (entering && entering.enter) entering.enter(options);

    window.scrollTo(0, 0);
    return true;
}

function initMenu() {
    document.querySelectorAll('.tabbar .tab').forEach(tab => {
        tab.addEventListener('click', () => showView(tab.dataset.tab));
    });

    document.getElementById('topbarBack').addEventListener('click', () => {
        const back = VIEWS[currentView].back;
        if (back) showView(back);
    });
    document.getElementById('topbarAvatar').addEventListener('click', () => showView('profile'));
    document.getElementById('topbarAdd').addEventListener('click', () => openApartmentForm());
}
