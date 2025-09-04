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
            'januar', 'februar', 'mart', 'april', 'maj', 'jun',
            'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'
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
    const priceText = price ? `\n*The total price for your stay is ${price}€.*` : '';
    
    // Determine garage entrance based on building
    const garageEntrance = apartmentInfo.building === "Parkview building" 
        ? "next to Maslačak dry cleaning" 
        : "next to Kaldi restaurant";
    
    if (askForDrive) {
        // Original message with drive option
        return `Dear ${guestName},

Thank you for your reservation and for choosing our apartment.
Your stay is confirmed from *${checkInFormatted}* to *${checkOutFormatted}*.${priceText}
The address is *${apartmentInfo.address}*, *${apartmentInfo.building}*.

Check-in is from *15:00*, and check-out until *11:00*.
The reception in the building is open from *9:00 a.m.* to *9:00 p.m.*.

If you are *arriving by car*, the garage entrance is located ${garageEntrance}.
*The garage is charged 10€ per day.*

The keys will be waiting for you at the reception under your name.
Payment is made in cash, and upon your arrival we will arrange
the most convenient time for collecting the payment.

In case you are *not arriving by car*, we can organize
our transport that will take you to the building.
Our driver will hand you the keys and collect the payment on the spot.
The cost of transportation is charged additionally.

We look forward to your arrival and wish you a pleasant stay.`;
    } else {
        // Simplified message without drive option
        return `Dear ${guestName},

Thank you for your reservation and for choosing our apartment.
Your stay is confirmed from *${checkInFormatted}* to *${checkOutFormatted}*.${priceText}
The address is *${apartmentInfo.address}*, *${apartmentInfo.building}*.

The garage entrance is located ${garageEntrance}.
*The garage is charged 10€ per day.*

The keys will be waiting for you at the reception under your name.
Payment is made in cash, and upon your arrival we will arrange
the most convenient time for collecting the payment.

We look forward to your arrival and wish you a pleasant stay.`;
    }
}

// Generate Serbian message
function generateSerbianMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price, askForDrive = true) {
    const priceText = price ? `\n*Ukupna cena za vaš boravak je ${price}€.*` : '';

    const garageEntrance = apartmentInfo.building === "Parkview building" 
        ? "pored hemijskog čišćenja Maslačak" 
        : "pored restorana Kaldi";

    if (askForDrive) {
        // Original message with drive option
        return `Poštovani ${guestName},

Hvala vam na rezervaciji i što ste izabrali naš apartman.
Vaš boravak je potvrđen od *${checkInFormatted}* do *${checkOutFormatted}*.${priceText}
Adresa je *${apartmentInfo.address}*, *${apartmentInfo.building}*.

Check-in je od *15:00h*, a check-out do *11:00h*.
Recepcija u zgradi radi od *9:00h* do *21:00h*.

Ako *dolazite automobilom*, ulaz u garažu se nalazi ${garageEntrance}.
*Garaža se naplaćuje 10€ po danu.*

Ključevi će vas čekati na recepciji na vaše ime.
Plaćanje se vrši u gotovini, a po vašem dolasku ćemo se dogovoriti
o najpovoljnijem vremenu za preuzimanje uplate.

U slučaju da *ne dolazite automobilom*, možemo organizovati
naš prevoz koji će vas dovesti do zgrade.
Naš vozač će vam predati ključeve i preuzeti uplatu na licu mesta.
Cena prevoza se dodatno naplaćuje.

Radujemo se vašem dolasku i želimo vam prijatan boravak.`;
    } else {
        // Simplified message without drive option
        return `Poštovani ${guestName},

Hvala vam na rezervaciji i što ste izabrali naš apartman.
Vaš boravak je potvrđen od *${checkInFormatted}* do *${checkOutFormatted}*.${priceText}
Adresa je *${apartmentInfo.address}*, *${apartmentInfo.building}*.

Check-in je od *15:00h*, a check-out do *11:00h*.
Recepcija u zgradi radi od *9:00h* do *21:00h*.

Ulaz u garažu se nalazi ${garageEntrance}.
*Garaža se naplaćuje 10€ po danu.*

Ključevi će vas čekati na recepciji na vaše ime.
Plaćanje se vrši u gotovini, a po vašem dolasku ćemo se dogovoriti
o najpovoljnijem vremenu za preuzimanje uplate.

        Radujemo se vašem dolasku i želimo vam prijatan boravak.`;
    }
}

// Generate garage info message in English
function generateGarageInfoEnglish(apartmentInfo) {
    const garageEntrance = apartmentInfo.building === "Parkview building" 
        ? "next to Maslačak dry cleaning" 
        : "next to Kaldi restaurant";
    
    return `🅿️ *Parking Information*

*Garage entrance* is located ${garageEntrance}.
*Parking fee:* 10€ per day.

At the ramp, use the intercom and provide apartment number *${apartmentInfo.apartment}*,
parking space number *${apartmentInfo.parking}* on level *${apartmentInfo.level}* and mention that it's for *${apartmentInfo.building === 'BW Aqua building' ? 'Aqua building' : 'Parkview building'}*.

After picking up the keys at reception, you will also receive a garage card that allows you to enter without needing to use the intercom.`;
}

// Generate garage info message in Serbian
function generateGarageInfoSerbian(apartmentInfo) {
    const garageEntrance = apartmentInfo.building === "Parkview building" 
        ? "pored hemijskog čišćenja Maslačak" 
        : "pored restorana Kaldi";
    
    return `🅿️ *Informacije o parkingu*

*Ulaz u garažu* se nalazi ${garageEntrance}.
*Cena parkinga:* 10€ po danu.

Na rampi se javite preko interfona i navedete broj apartmana *${apartmentInfo.apartment}*,
broj parking mesta *${apartmentInfo.parking}* na nivou *${apartmentInfo.level}* kao i da se radi o *${apartmentInfo.building === 'BW Aqua building' ? 'Aqua zgradi' : 'Parkview zgradi'}*.

Nakon toga, po preuzimanju ključa na recepciji, dobićete i karticu za garažu pomoću koje možete ulaziti bez potrebe da zvonite na interfon.`;
}