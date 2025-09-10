// Date and text formatting utilities

// Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Format date to readable format (e.g., "January 15th")
function formatDate(dateString, language = 'en') {
    const date = new Date(dateString);
    
    if (language === 'sr') {
        const months = [
            'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
            'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'
        ];
        const month = months[date.getMonth()];
        const day = date.getDate();
        return `${day}. ${month}`;
    } else {
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const day = date.getDate();
        const suffix = getOrdinalSuffix(day);
        return `${month} ${day}${suffix}`;
    }
}

// Generate the complete guest message
function generateGuestMessage(guestName, checkIn, checkOut, apartmentInfo, price, language = 'en', askForDrive = true) {
    const checkInFormatted = formatDate(checkIn, language);
    const checkOutFormatted = formatDate(checkOut, language);
    
    if (language === 'sr') {
        return generateSerbianMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price, askForDrive);
    } else {
        return generateEnglishMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price, askForDrive);
    }
}

// Generate English message
function generateEnglishMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price, askForDrive = true) {
    const priceText = price ? `, at the price of *${price}€*` : '';
    
    // Format address based on building and apartment
    let addressText = '';
    if (apartmentInfo.building === "BW Aqua") {
        if (apartmentInfo.apartment === "706" || apartmentInfo.apartment === "707") {
            addressText = `Belgrade Waterfront, *${apartmentInfo.address}*, building *${apartmentInfo.building}* on the 7th floor, apartment *${apartmentInfo.apartment}*.`;
        } else {
            addressText = `Belgrade Waterfront, *${apartmentInfo.address}*, building *${apartmentInfo.building}* on the 21st floor, apartment *${apartmentInfo.apartment}*.`;
        }
    } else if (apartmentInfo.building === "BW Parkview") {
        addressText = `Belgrade Waterfront, *${apartmentInfo.address}*, building *${apartmentInfo.building}* on the 21st floor, apartment *${apartmentInfo.apartment}*.`;
    } else {
        addressText = `*${apartmentInfo.address}*, *${apartmentInfo.building}*, apartment *${apartmentInfo.apartment}*.`;
    }
    
    if (askForDrive) {
        // New message format with drive option
        return `Dear ${guestName},

Thank you for your reservation and for choosing our apartment.

Your stay is confirmed from *${checkInFormatted}* to *${checkOutFormatted}*${priceText}.
Apartment address: 
${addressText}

Check-in: from *3:00 PM*
Check-out: until *11:00 AM*.
Reception in the building is open from *8:00 AM* to *9:00 PM* where you can pick up/return the apartment keys.
Security in the building works 24/7.

*Payment* is made in cash, upon arrival at the apartment.
If you are arriving by car, parking space is charged additionally *10€ per day*.
We organize transport to and from the airport which is charged depending on the schedule and number of people.

We look forward to your arrival and wish you a pleasant stay in our city!`;
    } else {
        // Simplified message without drive option
        return `Dear ${guestName},

Thank you for your reservation and for choosing our apartment.

Your stay is confirmed from *${checkInFormatted}* to *${checkOutFormatted}*${priceText}.
Apartment address: 
${addressText}

Check-in is from 3:00 PM, and check-out until 11:00 AM.
Reception in the building is open from 8:00 AM to 9:00 PM
where you can pick up/return the apartment keys.
Security in the building works 24/7.

Payment is made in cash, upon arrival at the apartment.

If you are arriving by car, parking space is charged additionally 10€ per day.

We look forward to your arrival and wish you a pleasant stay in our city!`;
    }
}

// Generate Serbian message
function generateSerbianMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price, askForDrive = true) {
    const priceText = price ? `, po ceni od *${price}€*` : '';

    // Format address based on building and apartment
    let addressText = '';
    if (apartmentInfo.building === "BW Aqua") {
        if (apartmentInfo.apartment === "706" || apartmentInfo.apartment === "707") {
            addressText = `Beograd na vodi, ulica *${apartmentInfo.address}*, zgrada *${apartmentInfo.building}* na 7. spratu, apartman *${apartmentInfo.apartment}*.`;
        } else {
            addressText = `Beograd na vodi, ulica *${apartmentInfo.address}*, zgrada *${apartmentInfo.building}* na 21. spratu, apartman *${apartmentInfo.apartment}*.`;
        }
    } else if (apartmentInfo.building === "BW Parkview") {
        addressText = `Beograd na vodi, ulica *${apartmentInfo.address}*, zgrada *${apartmentInfo.building}* na 21. spratu, apartman *${apartmentInfo.apartment}*.`;
    } else {
        addressText = `Beograd na vodi, ulica *${apartmentInfo.address}*, *${apartmentInfo.building}*, apartman *${apartmentInfo.apartment}*.`;
    }

    if (askForDrive) {
        // New message format with drive option
        return `Poštovani/a ${guestName},

Hvala vam na rezervaciji i što ste izabrali naš apartman.

Vaš boravak je potvrđen od *${checkInFormatted}* do *${checkOutFormatted}*${priceText}.
Adresa apartmana: 
${addressText}

Check-in: od *15:00h*
Check-out: do *11:00h*.
Recepcija u zgradi radi od *8:00h* do *21:00h* gde možete uzeti/vratiti ključeve apartmana.
Obezbeđenje u zgradi radi od 0-24h.

*Plaćanje* se vrši u gotovini, prilikom dolaska u apartman.
Ukoliko dolazite automobilom, garažno mesto se doplačuje *10€ po danu*.
Organizujemo prevoz od i do aerodroma koji se naplaćuje u zavisnosti od termina i broja osoba.

Radujemo se vašem dolasku i želimo vam prijatan boravak u našem gradu!`;
    } else {
        // Simplified message without drive option
        return `Poštovani/a ${guestName},

Hvala vam na rezervaciji i što ste izabrali naš apartman.

Vaš boravak je potvrđen od ${checkInFormatted} do ${checkOutFormatted}${priceText}.
Adresa apartmana: 
${addressText}

Check-in je od 15:00h, a check-out do 11:00h.
Recepcija u zgradi radi od 8:00h do 21:00h
gde možete uzeti/vratiti ključeve apartmana.
Obezbeđenje u zgradi radi od 0-24h.

Plaćanje se vrši u gotovini, pri dolasku u apartman.

Ako dolazite automobilom, garažno mesto se doplačuje 10€ po danu.

Radujemo se vašem dolasku i želimo vam prijatan boravak u našem gradu!`;
    }
}

// Generate garage info message in English
function generateGarageInfoEnglish(apartmentInfo) {
    const garageEntrance = apartmentInfo.building === "BW Parkview" 
        ? "next to Maslačak dry cleaning" 
        : "next to Kaldi restaurant";
    
    const buildingName = apartmentInfo.building === 'BW Aqua' ? 'Aqua building' : 'Parkview building';
    
    return `🅿️ Parking Information

Garage entrance is located ${garageEntrance}.

At the ramp, call via intercom, an employee will answer and you need to tell them:
*${buildingName}* - apartment number *${apartmentInfo.apartment}* 
parking space *${apartmentInfo.parking}* on level *${apartmentInfo.level}* 

You will pick up the garage card with the apartment keys at reception and then use it to enter the garage.`;
}

// Generate garage info message in Serbian
function generateGarageInfoSerbian(apartmentInfo) {
    const garageEntrance = apartmentInfo.building === "BW Parkview" 
        ? "pored hemijskog čišćenja Maslačak" 
        : "pored restorana Kaldi";
    
    const buildingName = apartmentInfo.building === 'BW Aqua' ? 'Aqua zgrada' : 'Parkview zgrada';
    
    return `🅿️ Informacije o parkingu

*Ulaz u garažu* se nalazi ${garageEntrance}.

Na rampi zvonite preko interfona, javiće se službenik kome treba da kažete:
*${buildingName}* - broj stana *${apartmentInfo.apartment}* 
parking mesto *${apartmentInfo.parking}* na nivou *${apartmentInfo.level}* 

Karticu za garažu preuzimate sa ključevima od stana na recepciji i nju posle koristite za ulazak u garažu.`;
}