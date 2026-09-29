// Side menu (hamburger) and view navigation

const VIEWS = {
    generator: 'viewGenerator',
    apartments: 'viewApartments',
    apartmentForm: 'viewApartmentForm',
    messages: 'viewMessages',
    profile: 'viewProfile'
};

// Menu item that is highlighted for each view
const VIEW_MENU_ITEM = {
    generator: 'generator',
    apartments: 'apartments',
    apartmentForm: 'apartments',
    messages: 'messages',
    profile: 'profile'
};

let currentView = 'generator';

// Called when a view is shown ({ enter }) or left ({ canLeave } returns false to stay)
const viewHooks = {};

function registerViewHooks(name, hooks) {
    viewHooks[name] = hooks;
}

function openMenu() {
    document.getElementById('sideMenu').classList.add('open');
    document.getElementById('sideMenu').setAttribute('aria-hidden', 'false');
    document.getElementById('menuBackdrop').hidden = false;
    document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
}

function closeMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    document.getElementById('sideMenu').setAttribute('aria-hidden', 'true');
    document.getElementById('menuBackdrop').hidden = true;
    document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
}

// Show a view; returns false when the current view refused to be left (unsaved changes)
function showView(name, options = {}) {
    const leaving = viewHooks[currentView];
    if (!options.force && name !== currentView && leaving && leaving.canLeave && !leaving.canLeave()) {
        return false;
    }

    Object.entries(VIEWS).forEach(([viewName, elementId]) => {
        document.getElementById(elementId).style.display = viewName === name ? 'block' : 'none';
    });
    currentView = name;

    document.querySelectorAll('#sideMenu .menu-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === VIEW_MENU_ITEM[name]);
    });

    const entering = viewHooks[name];
    if (entering && entering.enter) entering.enter(options);

    window.scrollTo(0, 0);
    return true;
}

function initMenu() {
    document.getElementById('menuBtn').addEventListener('click', openMenu);
    document.getElementById('menuCloseBtn').addEventListener('click', closeMenu);
    document.getElementById('menuBackdrop').addEventListener('click', closeMenu);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenu();
    });

    document.querySelectorAll('#sideMenu .menu-item').forEach(item => {
        item.addEventListener('click', () => {
            closeMenu();
            if (item.dataset.view) {
                showView(item.dataset.view);
            } else if (item.dataset.action === 'addApartment') {
                openApartmentForm();
            } else if (item.dataset.action === 'logout') {
                handleLogout();
            }
        });
    });

    // "← Back" buttons inside views
    document.querySelectorAll('.back-btn[data-view]').forEach(button => {
        button.addEventListener('click', () => showView(button.dataset.view));
    });
}
