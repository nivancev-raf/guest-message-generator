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
function generateMessage(language = 'en') {
    if (!validateForm()) {
        return;
    }
    
    const selectedApartment = document.getElementById('apartmentSelect').value;
    const guestName = document.getElementById('guestName').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const reservationPrice = document.getElementById('reservationPrice').value.trim();
    
    const apartmentInfo = apartmentData[selectedApartment];
    const message = generateGuestMessage(guestName, checkIn, checkOut, apartmentInfo, reservationPrice, language);
    
    document.getElementById('output').textContent = message;
    
    // Enable action buttons
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('autoWhatsappBtn').disabled = false;
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
    const phoneNumber = document.getElementById('phoneNumber').value;
    const output = document.getElementById('output');
    
    if (!output.textContent) return;
    
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const encodedMessage = encodeURIComponent(output.textContent);
    const whatsappURL = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    window.location.href = whatsappURL;
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePWA();
});
