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

// Handle login form submit
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    loginError.style.display = 'none';
    if (!email || !password) {
        loginError.textContent = 'Please enter email and password.';
        loginError.style.display = 'block';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    try {
        const session = await signIn(email, password);
        document.getElementById('loginPassword').value = '';
        await enterApp(session);
    } catch (error) {
        loginError.textContent = error && error.message === 'Invalid login credentials'
            ? 'Wrong email or password.'
            : 'Login failed. Check your internet connection and try again.';
        loginError.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Log in';
    }
}

async function handleLogout() {
    try {
        await signOut();
    } catch (error) {
        console.error('Logout failed', error);
    }
    resetAppState();
    showScreen('login');
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
    currentUser = session.user;
    showScreen('app');
    await loadUserData();
}

async function loadUserData() {
    const loadError = document.getElementById('loadError');
    loadError.style.display = 'none';
    try {
        const [profile, apartmentList] = await Promise.all([
            fetchProfile(currentUser.id),
            fetchApartments()
        ]);
        currentProfile = profile;
        apartments = apartmentList;
    } catch (error) {
        console.error('Loading data failed', error);
        document.getElementById('loadErrorText').textContent = 'Could not load your apartments. Check your internet connection.';
        loadError.style.display = 'flex';
    }

    updateGreeting();

    populateApartmentSelect();
    selectDefaultApartment();
}

function getDisplayName() {
    if (currentProfile && currentProfile.display_name) return currentProfile.display_name;
    return currentUser ? currentUser.email.split('@')[0] : '';
}

// Greeting in the top bar kicker of the Generate screen + avatar initial
function updateGreeting() {
    const name = getDisplayName();
    VIEWS.generator.kicker = name ? `HELLO, ${name.toUpperCase()}` : 'SMARTHOST';
    if (currentView === 'generator') setTopbar(undefined, VIEWS.generator.kicker);

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
        parking = `Parking ${apartment.parking_spot}${apartment.garage_level ? `, level ${apartment.garage_level}` : ''}`;
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

// The last generated message (shown on the "Ready to send" screen)
let generatedMessage = '';
let copiedTimer = null;

function handleGenerate() {
    if (getMessageType() === 'garage') {
        generateGarageInfo();
    } else {
        generateMessage();
    }
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
        languageName(selectedLanguage)
    ]);
}

function languageName(language) {
    return language === 'sr' ? 'Srpski' : 'English';
}

// Render WhatsApp *bold* runs as <strong>, keeping line breaks (text nodes only, no HTML injection)
function renderWhatsAppText(container, text) {
    container.textContent = '';
    text.split(/(\*[^*\n]+\*)/g).forEach(part => {
        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
            const strong = document.createElement('strong');
            strong.textContent = part.slice(1, -1);
            container.appendChild(strong);
        } else if (part) {
            container.appendChild(document.createTextNode(part));
        }
    });
}

function showGeneratedMessage(message, kicker, chips) {
    generatedMessage = message;

    const chipContainer = document.getElementById('generatedChips');
    chipContainer.innerHTML = '';
    chips.filter(Boolean).forEach(label => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = label;
        chipContainer.appendChild(chip);
    });

    renderWhatsAppText(document.getElementById('output'), message);
    document.getElementById('outputCount').textContent = `${message.length} characters`;

    resetCopyButton();
    updateWhatsAppButton();
    VIEWS.generated.kicker = kicker;
    showView('generated');
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

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    initMenu();
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

    // Session expired or logged out in another tab
    onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' && currentUser) {
            resetAppState();
            showScreen('login');
        }
    });

    try {
        const session = await getSession();
        if (session) {
            await enterApp(session);
        } else {
            showScreen('login');
        }
    } catch (error) {
        console.error('Session check failed', error);
        showScreen('login');
    }
});
