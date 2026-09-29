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

    const name = (currentProfile && currentProfile.display_name) || currentUser.email.split('@')[0];
    document.getElementById('greeting').textContent = `Hello ${name}!`;

    populateApartmentSelect();
    selectDefaultApartment();
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

// Update apartment information display
function updateApartmentInfo() {
    const apartment = getSelectedApartment();
    const infoDiv = document.getElementById('apartmentInfo');
    infoDiv.innerHTML = '';

    if (!apartment) {
        infoDiv.style.display = 'none';
        return;
    }

    const rows = [
        ['Address', apartment.address],
        ['Building', apartment.building],
        ['Entrance', apartment.entrance],
        ['Floor', apartment.floor],
        ['Apartment', apartment.apartment_number],
        ['Parking', apartment.parking_spot && `Slot ${apartment.parking_spot}${apartment.garage_level ? `, Level ${apartment.garage_level}` : ''}`]
    ];

    rows.filter(([, value]) => value).forEach(([label, value]) => {
        const row = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        row.appendChild(strong);
        row.appendChild(document.createTextNode(value));
        infoDiv.appendChild(row);
    });
    infoDiv.style.display = 'block';
}

// Clear form validation styling
function clearValidation() {
    document.querySelectorAll('.required').forEach(el => el.classList.remove('required'));
    document.getElementById('errorMessage').style.display = 'none';
    updateButtonStates();
}

// Validate form inputs
function validateForm() {
    const apartment = document.getElementById('apartmentSelect').value;
    const guestName = document.getElementById('guestName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const reservationPrice = document.getElementById('reservationPrice').value.trim();
    
    const errorMessage = document.getElementById('errorMessage');
    
    document.querySelectorAll('.required').forEach(el => el.classList.remove('required'));
    
    let missingFields = [];
    let isValid = true;
    
    if (!apartment) {
        missingFields.push('Apartment');
        document.getElementById('apartmentSelect').classList.add('required');
        isValid = false;
    }
    
    if (!guestName) {
        missingFields.push('Guest Name');
        document.getElementById('guestName').classList.add('required');
        isValid = false;
    }
    
    if (!phoneNumber) {
        missingFields.push('Mobile Number');
        document.getElementById('phoneNumber').classList.add('required');
        isValid = false;
    }
    
    if (!checkIn) {
        missingFields.push('Check-in Date');
        document.getElementById('checkIn').classList.add('required');
        isValid = false;
    }
    
    if (!checkOut) {
        missingFields.push('Check-out Date');
        document.getElementById('checkOut').classList.add('required');
        isValid = false;
    }
    
    if (!reservationPrice) {
        missingFields.push('Reservation Price');
        document.getElementById('reservationPrice').classList.add('required');
        isValid = false;
    }
    
    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
        missingFields.push('Check-out date must be after check-in date');
        document.getElementById('checkOut').classList.add('required');
        isValid = false;
    }
    
    if (!isValid) {
        errorMessage.textContent = `Please fill in: ${missingFields.join(', ')}`;
        errorMessage.style.display = 'block';
    } else {
        errorMessage.style.display = 'none';
    }
    
    return isValid;
}

// Generate message based on form inputs
function generateMessage() {
    if (!validateForm()) {
        return;
    }
    
    const selectedLanguage = document.querySelector('input[name="language"]:checked').value;
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
    
    document.getElementById('output').textContent = message;
    enableActionButtons();
}

// Copy generated message to clipboard
function copyToClipboard() {
    const output = document.getElementById('output');
    if (output.textContent) {
        navigator.clipboard.writeText(output.textContent).then(() => {
            alert('Message copied to clipboard!');
        });
    }
}

// Auto-send message via WhatsApp (redirects current tab)
function autoSendToWhatsApp() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const output = document.getElementById('output');
    
    if (!phoneNumber) {
        showErrorMessage('Please enter a mobile number to send via WhatsApp.');
        return;
    }
    
    if (!output.textContent) {
        showErrorMessage('Please generate a message first.');
        return;
    }
    
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const encodedMessage = encodeURIComponent(output.textContent);
    const whatsappURL = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    window.location.href = whatsappURL;
}

// Generate garage info message
function generateGarageInfo() {
    const output = document.getElementById('output');
    const apartment = getSelectedApartment();
    
    if (!apartment) {
        showErrorMessage('Please select an apartment first.');
        return;
    }
    
    const selectedLanguage = document.querySelector('input[name="language"]:checked').value;
    output.textContent = generateFromTemplate(apartment, selectedLanguage, 'garage');
    enableActionButtons();
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
    
    updateApartmentInfo();
    
    // Clear validation and output
    clearValidation();
    document.getElementById('output').textContent = '';
    disableActionButtons();
}

// Update button states based on form completion
function updateButtonStates() {
    const apartment = document.getElementById('apartmentSelect').value;
    const guestName = document.getElementById('guestName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const price = document.getElementById('reservationPrice').value.trim();
    
    // Enable garage button when apartment is selected
    const garageButton = document.getElementById('generateGarageBtn');
    garageButton.disabled = !apartment;
    document.getElementById('editTemplatesBtn').disabled = !apartment;
    
    // Enable message generation button only when all fields are filled
    const allFieldsFilled = apartment && guestName && phoneNumber && checkIn && checkOut && price;
    const messageButton = document.getElementById('generateMessageBtn');
    messageButton.disabled = !allFieldsFilled;
    
    // Update WhatsApp button state and validation text
    updateWhatsAppValidation();
}

// Enable action buttons (copy, whatsapp)
function enableActionButtons() {
    document.getElementById('copyBtn').disabled = false;
    
    // Enable WhatsApp button only if phone number is provided
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const whatsappBtn = document.getElementById('autoWhatsappBtn');
    const whatsappValidation = document.getElementById('whatsappValidation');
    
    whatsappBtn.disabled = !phoneNumber;
    
    // Show/hide validation text
    if (!phoneNumber) {
        whatsappValidation.style.display = 'block';
    } else {
        whatsappValidation.style.display = 'none';
    }
}

// Disable action buttons
function disableActionButtons() {
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('autoWhatsappBtn').disabled = true;
    
    // Hide validation text when buttons are disabled (no message generated)
    document.getElementById('whatsappValidation').style.display = 'none';
}

// Update WhatsApp button state and validation
function updateWhatsAppValidation() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const output = document.getElementById('output');
    const whatsappBtn = document.getElementById('autoWhatsappBtn');
    const whatsappValidation = document.getElementById('whatsappValidation');
    
    // Only show validation if there's a message generated but no phone number
    if (output.textContent && !phoneNumber) {
        whatsappBtn.disabled = true;
        whatsappValidation.style.display = 'block';
    } else if (output.textContent && phoneNumber) {
        whatsappBtn.disabled = false;
        whatsappValidation.style.display = 'none';
    } else {
        whatsappBtn.disabled = true;
        whatsappValidation.style.display = 'none';
    }
}

// Show error message
function showErrorMessage(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
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
    
    // Add event listeners to language radio buttons
    const languageRadios = document.querySelectorAll('input[name="language"]');
    languageRadios.forEach(radio => {
        radio.addEventListener('change', updateButtonStates);
    });

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
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
