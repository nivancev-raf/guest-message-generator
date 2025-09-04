// Main application logic

// Update apartment information display
function updateApartmentInfo() {
    const selectedApartment = document.getElementById('apartmentSelect').value;
    const infoDiv = document.getElementById('apartmentInfo');
    
    if (selectedApartment && apartmentData[selectedApartment]) {
        const data = apartmentData[selectedApartment];
        infoDiv.innerHTML = `
            <strong>Address:</strong> ${data.address}<br>
            <strong>Building:</strong> ${data.building}<br>
            <strong>Apartment:</strong> ${data.apartment}<br>
            <strong>Parking:</strong> Slot ${data.parking}, Level ${data.level}
        `;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
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
    const selectedApartment = document.getElementById('apartmentSelect').value;
    const guestName = document.getElementById('guestName').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const reservationPrice = document.getElementById('reservationPrice').value.trim();
    const askForDrive = document.getElementById('askForDrive').checked;
    
    const apartmentInfo = apartmentData[selectedApartment];
    const message = generateGuestMessage(guestName, checkIn, checkOut, apartmentInfo, reservationPrice, selectedLanguage, askForDrive);
    
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
    const apartmentSelect = document.getElementById('apartmentSelect');
    const output = document.getElementById('output');
    
    if (!apartmentSelect.value) {
        showErrorMessage('Please select an apartment first.');
        return;
    }
    
    const selectedLanguage = document.querySelector('input[name="language"]:checked').value;
    const apartmentInfo = apartmentData[apartmentSelect.value];
    let message;
    
    if (selectedLanguage === 'sr') {
        message = generateGarageInfoSerbian(apartmentInfo);
    } else {
        message = generateGarageInfoEnglish(apartmentInfo);
    }
    
    output.textContent = message;
    enableActionButtons();
}

// Clear all form fields
function clearAllFields() {
    document.getElementById('apartmentSelect').value = '';
    document.getElementById('guestName').value = '';
    document.getElementById('phoneNumber').value = '';
    document.getElementById('checkIn').value = '';
    document.getElementById('checkOut').value = '';
    document.getElementById('reservationPrice').value = '';
    document.getElementById('askForDrive').checked = true;
    
    // Hide apartment info
    document.getElementById('apartmentInfo').style.display = 'none';
    
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
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Initial button state update
    updateButtonStates();
});
