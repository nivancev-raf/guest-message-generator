// Main application logic

// Loaded after login
let currentUser = null;
let currentProfile = null;
let apartments = [];

function getApartmentById(id) {
    return apartments.find(apartment => apartment.id === id) || null;
}

function getSelectedApartment() {
    return getApartmentById(document.getElementById('apartmentSelect').value);
}

// Show one of the screens: 'loading', 'login' or 'app'
function showScreen(name) {
    document.getElementById('loadingScreen').style.display = name === 'loading' ? 'flex' : 'none';
    document.getElementById('loginScreen').style.display = name === 'login' ? 'block' : 'none';
    document.getElementById('appScreen').style.display = name === 'app' ? 'block' : 'none';
}

function isSupabaseConfigured() {
    return !SUPABASE_URL.includes('YOUR-PROJECT-REF') && !SUPABASE_ANON_KEY.includes('YOUR-ANON');
}

// Login screen modes: 'login', 'signup', 'forgot', 'reset' (new password) or 'status' (message)
const AUTH_FORMS = { login: 'loginForm', signup: 'signupForm', forgot: 'forgotForm', reset: 'resetForm' };
const MIN_PASSWORD_LENGTH = 8;

function setAuthMode(mode, statusMessage) {
    Object.entries(AUTH_FORMS).forEach(([formMode, formId]) => {
        document.getElementById(formId).style.display = formMode === mode ? 'flex' : 'none';
    });
    document.querySelectorAll('.auth-form .form-error').forEach(error => {
        error.style.display = 'none';
    });

    const status = document.getElementById('authStatus');
    status.style.display = mode === 'status' ? 'flex' : 'none';
    document.getElementById('authStatusText').textContent = statusMessage || '';
}

function showAuthError(errorId, message) {
    const error = document.getElementById(errorId);
    error.textContent = message;
    error.style.display = 'block';
}

// Disable a submit button and show a busy label while the request runs
async function withBusyButton(buttonId, busyLabel, action) {
    const button = document.getElementById(buttonId);
    const label = button.textContent;
    button.disabled = true;
    button.textContent = busyLabel;
    try {
        await action();
    } finally {
        button.disabled = false;
        button.textContent = label;
    }
}

// Error message for a new password, or '' when it is fine
function validateNewPassword(password, confirmation) {
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must have at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (password !== confirmation) return 'Passwords do not match.';
    return '';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authErrorMessage(error, fallback) {
    const message = (error && error.message) || '';
    if (/already registered/i.test(message)) return 'An account with this email already exists. Log in instead.';
    if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for the link.';
    if (/password/i.test(message) && /(weak|short|characters)/i.test(message)) return message;
    if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a few minutes and try again.';
    return fallback;
}

// Handle login form submit
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    document.getElementById('loginError').style.display = 'none';
    if (!email || !password) {
        showAuthError('loginError', 'Please enter email and password.');
        return;
    }

    await withBusyButton('loginBtn', 'Logging in...', async () => {
        try {
            const session = await signIn(email, password);
            document.getElementById('loginPassword').value = '';
            await enterApp(session);
        } catch (error) {
            showAuthError('loginError', error && error.message === 'Invalid login credentials'
                ? 'Wrong email or password.'
                : authErrorMessage(error, 'Login failed. Check your internet connection and try again.'));
        }
    });
}

async function handleSignup(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmation = document.getElementById('signupPasswordConfirm').value;

    document.getElementById('signupError').style.display = 'none';
    if (!name) return showAuthError('signupError', 'Please enter your name.');
    if (!isValidEmail(email)) return showAuthError('signupError', 'Please enter a valid email address.');
    const passwordError = validateNewPassword(password, confirmation);
    if (passwordError) return showAuthError('signupError', passwordError);

    await withBusyButton('signupBtn', 'Creating account...', async () => {
        try {
            const session = await signUp(email, password, name);
            document.getElementById('signupForm').reset();
            if (session) {
                await enterApp(session);
            } else {
                setAuthMode('status', `We sent a confirmation link to ${email}. Open it to activate your account, then log in.`);
            }
        } catch (error) {
            showAuthError('signupError', authErrorMessage(error, 'Creating the account failed. Check your internet connection and try again.'));
        }
    });
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();

    document.getElementById('forgotError').style.display = 'none';
    if (!isValidEmail(email)) return showAuthError('forgotError', 'Please enter a valid email address.');

    await withBusyButton('forgotBtn', 'Sending...', async () => {
        try {
            await sendPasswordReset(email);
            // Same message whether or not the account exists
            setAuthMode('status', `If an account exists for ${email}, we sent a link to set a new password. Check your inbox (and spam folder).`);
        } catch (error) {
            showAuthError('forgotError', authErrorMessage(error, 'Sending the email failed. Check your internet connection and try again.'));
        }
    });
}

// New password after opening the reset link (the link already logged the user in)
async function handleSetNewPassword(event) {
    event.preventDefault();
    const password = document.getElementById('resetPassword').value;
    const confirmation = document.getElementById('resetPasswordConfirm').value;

    document.getElementById('resetError').style.display = 'none';
    const passwordError = validateNewPassword(password, confirmation);
    if (passwordError) return showAuthError('resetError', passwordError);

    await withBusyButton('resetBtn', 'Saving...', async () => {
        try {
            await updatePassword(password);
            document.getElementById('resetForm').reset();
            await enterApp(await getSession());
        } catch (error) {
            showAuthError('resetError', authErrorMessage(error, 'Saving the password failed. Open the link from the email again.'));
        }
    });
}

function showPasswordReset() {
    showScreen('login');
    setAuthMode('reset');
}

function initAuthForms() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('forgotForm').addEventListener('submit', handleForgotPassword);
    document.getElementById('resetForm').addEventListener('submit', handleSetNewPassword);
    document.querySelectorAll('[data-auth-mode]').forEach(link => {
        link.addEventListener('click', () => setAuthMode(link.dataset.authMode));
    });
}

async function handleLogout() {
    try {
        await signOut();
    } catch (error) {
        console.error('Logout failed', error);
    }
    resetAppState();
    showScreen('login');
    setAuthMode('login');
}

function resetAppState() {
    showView('generator', { force: true });
    currentUser = null;
    currentProfile = null;
    apartments = [];
    populateApartmentSelect();
    clearAllFields();
}

// Load profile + apartments and show the main screen
async function enterApp(session) {
    showScreen('app');
    if (currentUser) return;
    currentUser = session.user;
    await loadUserData();
}

async function loadUserData() {
    const loadError = document.getElementById('loadError');
    loadError.style.display = 'none';
    let loaded = false;
    try {
        const [profile, apartmentList] = await Promise.all([
            fetchProfile(currentUser.id),
            fetchApartments()
        ]);
        currentProfile = profile;
        apartments = apartmentList;
        loaded = true;
    } catch (error) {
        console.error('Loading data failed', error);
        document.getElementById('loadErrorText').textContent = 'Could not load your apartments. Check your internet connection.';
        loadError.style.display = 'flex';
    }

    updateGreeting();

    populateApartmentSelect();
    selectDefaultApartment();

    // New account: start by adding the first apartment
    if (loaded && apartments.length === 0 && currentView === 'generator') {
        showView('apartments');
    }
}

function getDisplayName() {
    if (currentProfile && currentProfile.display_name) return currentProfile.display_name;
    return currentUser ? currentUser.email.split('@')[0] : '';
}

// Greeting in the top bar kicker of the Generate screen + avatar initial
function updateGreeting() {
    const name = getDisplayName();
    VIEWS.generator.kicker = name ? `HELLO, ${name.toUpperCase()}` : 'SMARTHOST';
    setTopbar(undefined, VIEWS.generator.kicker, 'generator');

    const avatar = document.getElementById('topbarAvatar');
    avatar.textContent = name.trim().charAt(0).toUpperCase();
    avatar.setAttribute('aria-label', `Hello ${name}! Open profile`);
}

// Fill the apartment dropdown with the user's apartments
function populateApartmentSelect() {
    const select = document.getElementById('apartmentSelect');
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose apartment...';
    select.appendChild(placeholder);

    apartments.forEach(apartment => {
        const option = document.createElement('option');
        option.value = apartment.id;
        option.textContent = apartment.name;
        select.appendChild(option);
    });
}

// Default apartment: the one from the profile, or the only one the user has
function getDefaultApartmentId() {
    if (currentProfile && currentProfile.default_apartment_id && getApartmentById(currentProfile.default_apartment_id)) {
        return currentProfile.default_apartment_id;
    }
    return apartments.length === 1 ? apartments[0].id : '';
}

function selectDefaultApartment() {
    document.getElementById('apartmentSelect').value = getDefaultApartmentId();
    updateApartmentInfo();
    updateButtonStates();
}

// Update the apartment summary line under the dropdown
function updateApartmentInfo() {
    const apartment = getSelectedApartment();
    const infoDiv = document.getElementById('apartmentInfo');

    if (!apartment) {
        infoDiv.textContent = '';
        infoDiv.style.display = 'none';
        return;
    }

    let parking = '';
    if (apartment.parking_spot) {
        parking = `Parking ${apartment.parking_spot}${apartment.garage_level ? `, level ${apartment.garage_level}` : ''}${apartment.garage_pillar ? `, pillar ${apartment.garage_pillar}` : ''}`;
    }
    const parts = [
        apartment.building,
        apartment.address,
        apartment.apartment_number && `Apt ${apartment.apartment_number}`,
        parking
    ].filter(Boolean);

    infoDiv.textContent = parts.join(' · ');
    infoDiv.style.display = parts.length ? 'block' : 'none';
}

// Reservation or garage info, chosen with the type control on the Generate screen
function getMessageType() {
    return document.querySelector('input[name="messageType"]:checked').value;
}

function getGeneratorLanguage() {
    return document.querySelector('input[name="language"]:checked').value;
}

// Inline field errors
const VALIDATED_FIELDS = ['apartmentSelect', 'guestName', 'phoneNumber', 'checkIn', 'checkOut', 'reservationPrice'];

function setFieldError(fieldId, message) {
    document.getElementById(fieldId).classList.toggle('required', !!message);
    document.getElementById(`${fieldId}Error`).textContent = message || '';
}

// Clear form validation styling
function clearValidation() {
    VALIDATED_FIELDS.forEach(fieldId => setFieldError(fieldId, ''));
    updateButtonStates();
}

// Validate form inputs (garage info only needs an apartment)
function validateForm() {
    const isGarage = getMessageType() === 'garage';
    const apartment = document.getElementById('apartmentSelect').value;
    const guestName = document.getElementById('guestName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const reservationPrice = document.getElementById('reservationPrice').value.trim();

    VALIDATED_FIELDS.forEach(fieldId => setFieldError(fieldId, ''));
    let firstInvalid = null;
    const fail = (fieldId, message) => {
        setFieldError(fieldId, message);
        if (!firstInvalid) firstInvalid = fieldId;
    };

    if (!apartment) fail('apartmentSelect', 'Choose an apartment');

    if (!isGarage) {
        if (!guestName) fail('guestName', 'Enter the guest name');
        if (!phoneNumber) fail('phoneNumber', 'Enter the mobile number');
        if (!checkIn) fail('checkIn', 'Choose a date');
        if (!checkOut) fail('checkOut', 'Choose a date');
        if (!reservationPrice) fail('reservationPrice', 'Enter the total price');
        if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
            fail('checkOut', 'Must be after check-in');
        }
    }

    if (firstInvalid) {
        document.getElementById(firstInvalid).focus();
        return false;
    }
    return true;
}

// The last generated message (shown on the "Ready to send" screen).
// generatedMessage may be edited by hand on that screen; originalMessage is what the template produced.
let generatedMessage = '';
let originalMessage = '';
let copiedTimer = null;
let generating = false;

// Short "Generating…" state, then the preview slides in
function handleGenerate() {
    if (generating || !validateForm()) return;

    const generateBtn = document.getElementById('generateBtn');
    generating = true;
    generateBtn.textContent = 'Generating…';
    generateBtn.classList.add('is-busy');
    setTimeout(() => {
        generating = false;
        generateBtn.classList.remove('is-busy');
        updateButtonStates();
        if (getMessageType() === 'garage') {
            generateGarageInfo();
        } else {
            generateMessage();
        }
    }, motionDelay(500));
}

// Generate message based on form inputs
function generateMessage() {
    if (!validateForm()) {
        return;
    }

    const selectedLanguage = getGeneratorLanguage();
    const guestName = document.getElementById('guestName').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const reservationPrice = document.getElementById('reservationPrice').value.trim();
    const askForDrive = document.getElementById('askForDrive').checked;

    const apartment = getSelectedApartment();
    const templateKey = askForDrive ? 'reservation' : 'reservation_no_transport';
    const message = generateFromTemplate(apartment, selectedLanguage, templateKey, {
        guestName,
        checkIn,
        checkOut,
        price: reservationPrice
    });

    showGeneratedMessage(message, 'RESERVATION MESSAGE', [
        apartment.name,
        guestName,
        `${formatDate(checkIn, selectedLanguage)} – ${formatDate(checkOut, selectedLanguage)}`,
        languageName(selectedLanguage)
    ]);
}

// Generate garage info message
function generateGarageInfo() {
    if (!validateForm()) {
        return;
    }

    const apartment = getSelectedApartment();
    const selectedLanguage = getGeneratorLanguage();
    const message = generateFromTemplate(apartment, selectedLanguage, 'garage');

    showGeneratedMessage(message, 'GARAGE INFO', [
        apartment.name,
        apartment.parking_spot && `Parking ${apartment.parking_spot}`,
        apartment.garage_pillar && `Pillar ${apartment.garage_pillar}`,
        languageName(selectedLanguage)
    ]);
}

function languageName(language) {
    return language === 'sr' ? 'Srpski' : 'English';
}

// Render WhatsApp *bold* runs as <strong>, one element per line (text nodes only, no HTML injection)
function renderWhatsAppText(container, text) {
    container.textContent = '';
    text.split('\n').forEach((lineText, index) => {
        const line = document.createElement('div');
        line.className = 'message-line';
        // Stagger is capped at 24 lines
        line.style.setProperty('--line', Math.min(index, 24));
        lineText.split(/(\*[^*\n]+\*)/g).forEach(part => {
            if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
                const strong = document.createElement('strong');
                strong.textContent = part.slice(1, -1);
                line.appendChild(strong);
            } else if (part) {
                line.appendChild(document.createTextNode(part));
            }
        });
        container.appendChild(line);
    });
}

function showGeneratedMessage(message, kicker, chips) {
    generatedMessage = message;
    originalMessage = message;

    const chipContainer = document.getElementById('generatedChips');
    chipContainer.innerHTML = '';
    chips.filter(Boolean).forEach(label => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = label;
        chipContainer.appendChild(chip);
    });

    closeMessageEditor();
    renderGeneratedMessage();

    resetCopyButton();
    updateWhatsAppButton();
    VIEWS.generated.kicker = kicker;
    showView('generated');
    revealMessageLines();
}

function renderGeneratedMessage() {
    renderWhatsAppText(document.getElementById('output'), generatedMessage);
    document.getElementById('outputCount').textContent = `${generatedMessage.length} characters`;
    document.getElementById('undoMessageBtn').style.display = generatedMessage !== originalMessage ? 'inline-flex' : 'none';
}

// Lines fade in one after another, starting shortly after the push begins
function revealMessageLines() {
    const output = document.getElementById('output');
    output.classList.remove('is-revealed');
    output.classList.add('reveal-pending');
    setTimeout(() => {
        output.classList.add('is-revealed');
        output.classList.remove('reveal-pending');
    }, motionDelay(260));
}

// --- Editing only this message (the template stays unchanged) ---

function isEditingMessage() {
    return document.getElementById('outputEditor').style.display !== 'none';
}

function openMessageEditor() {
    const editor = document.getElementById('outputEditor');
    editor.value = generatedMessage;
    document.getElementById('output').style.display = 'none';
    editor.style.display = 'block';
    editor.style.height = 'auto';
    editor.style.height = `${editor.scrollHeight + 2}px`;
    document.getElementById('editMessageBtn').textContent = 'Done';
    editor.focus();
}

function closeMessageEditor() {
    document.getElementById('outputEditor').style.display = 'none';
    document.getElementById('output').style.display = 'block';
    document.getElementById('editMessageBtn').textContent = 'Edit';
}

function toggleMessageEditor() {
    if (isEditingMessage()) {
        closeMessageEditor();
        renderGeneratedMessage();
    } else {
        openMessageEditor();
    }
}

function handleMessageEdit() {
    const editor = document.getElementById('outputEditor');
    generatedMessage = editor.value;
    editor.style.height = 'auto';
    editor.style.height = `${editor.scrollHeight + 2}px`;
    document.getElementById('outputCount').textContent = `${generatedMessage.length} characters`;
    document.getElementById('undoMessageBtn').style.display = generatedMessage !== originalMessage ? 'inline-flex' : 'none';
    updateWhatsAppButton();
}

function undoMessageChanges() {
    generatedMessage = originalMessage;
    if (isEditingMessage()) {
        document.getElementById('outputEditor').value = generatedMessage;
        handleMessageEdit();
    } else {
        renderGeneratedMessage();
    }
}

function initMessageEditing() {
    document.getElementById('editMessageBtn').addEventListener('click', toggleMessageEditor);
    document.getElementById('undoMessageBtn').addEventListener('click', undoMessageChanges);
    document.getElementById('outputEditor').addEventListener('input', handleMessageEdit);
}

function resetCopyButton() {
    clearTimeout(copiedTimer);
    document.getElementById('copyBtn').textContent = 'Copy';
}

// Copy generated message to clipboard
function copyToClipboard() {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.textContent = 'Copied';
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(resetCopyButton, 2000);
        showToast('Copied to clipboard');
    }).catch(error => {
        console.error('Copy failed', error);
    });
}

// WhatsApp button: needs a phone number
function updateWhatsAppButton() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    document.getElementById('autoWhatsappBtn').disabled = !phoneNumber || !generatedMessage;
    document.getElementById('whatsappSub').textContent = phoneNumber ? `to ${phoneNumber}` : 'Add a number first';
}

// Auto-send message via WhatsApp (redirects current tab)
function autoSendToWhatsApp() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    if (!phoneNumber || !generatedMessage) {
        return;
    }

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const encodedMessage = encodeURIComponent(generatedMessage);
    const whatsappURL = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

    window.location.href = whatsappURL;
}

// Clear all form fields
function clearAllFields() {
    document.getElementById('apartmentSelect').value = getDefaultApartmentId();
    document.getElementById('guestName').value = '';
    document.getElementById('phoneNumber').value = '';
    document.getElementById('checkIn').value = '';
    document.getElementById('checkOut').value = '';
    document.getElementById('reservationPrice').value = '';
    document.getElementById('askForDrive').checked = true;
    document.querySelector('input[name="messageType"][value="res"]').checked = true;

    updateApartmentInfo();

    // Clear validation and output
    generatedMessage = '';
    originalMessage = '';
    document.getElementById('output').textContent = '';
    clearValidation();
}

// Night count under the dates
function updateNightsLabel() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const label = document.getElementById('nightsLabel');

    if (!checkIn || !checkOut) {
        label.textContent = '';
        label.classList.remove('invalid');
        return;
    }
    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    label.textContent = nights > 0
        ? `${nights} ${nights === 1 ? 'night' : 'nights'}`
        : 'Check-out must be after check-in';
    label.classList.toggle('invalid', nights <= 0);
}

// Update the Generate screen for the chosen type and inputs
function updateButtonStates() {
    const isGarage = getMessageType() === 'garage';
    document.getElementById('viewGenerator').classList.toggle('mode-garage', isGarage);
    document.getElementById('generateBtn').textContent = isGarage ? 'Generate garage info' : 'Generate message';
    updateNightsLabel();
    updateWhatsAppButton();
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    initializePWA();
    
    // Add event listeners to form inputs for real-time button state updates
    const formInputs = document.querySelectorAll('#apartmentSelect, #guestName, #phoneNumber, #checkIn, #checkOut, #reservationPrice');
    formInputs.forEach(input => {
        input.addEventListener('input', updateButtonStates);
        input.addEventListener('change', updateButtonStates);
    });
    
    // Type and language controls
    document.querySelectorAll('input[name="language"], input[name="messageType"]').forEach(radio => {
        radio.addEventListener('change', clearValidation);
    });
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    initAuthForms();
    initMenu();
    initMessageEditing();
    showView('generator', { force: true });
    initApartments();
    initMessagesEditor();
    initProfile();
    document.getElementById('retryLoadBtn').addEventListener('click', loadUserData);
    
    // Initial button state update
    updateButtonStates();

    if (!supabaseClient || !isSupabaseConfigured()) {
        showScreen('login');
        const loginError = document.getElementById('loginError');
        loginError.textContent = supabaseClient
            ? 'The app is not configured yet (missing Supabase settings in config.js).'
            : 'Could not connect. Check your internet connection and reopen the app.';
        loginError.style.display = 'block';
        document.getElementById('loginBtn').disabled = true;
        return;
    }

    // Session expired or logged out in another tab; reset link opened in this tab
    onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' && currentUser) {
            resetAppState();
            showScreen('login');
            setAuthMode('login');
        } else if (event === 'PASSWORD_RECOVERY') {
            showPasswordReset();
        }
    });

    if (authLinkError) {
        history.replaceState(null, '', APP_URL);
        showScreen('login');
        showAuthError('loginError', /expired|invalid/i.test(authLinkError)
            ? 'This link has expired or was already used. Please request a new one.'
            : authLinkError);
        return;
    }

    try {
        const session = await getSession();
        if (session && isPasswordRecoveryLink) {
            showPasswordReset();
        } else if (session) {
            await enterApp(session);
        } else {
            showScreen('login');
        }
    } catch (error) {
        console.error('Session check failed', error);
        showScreen('login');
    }
});
