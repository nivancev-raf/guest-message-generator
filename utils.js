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
function generateGuestMessage(guestName, checkIn, checkOut, apartmentInfo, price, language = 'en') {
    const checkInFormatted = formatDate(checkIn, language);
    const checkOutFormatted = formatDate(checkOut, language);
    
    if (language === 'sr') {
        return generateSerbianMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price);
    } else {
        return generateEnglishMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price);
    }
}

// Generate English message
function generateEnglishMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price) {
    const priceText = price ? `\n*The total price for your stay is ${price}€.*` : '';
    
    return `Dear ${guestName},

Thank you for your reservation and for choosing our apartment.
Your stay is confirmed from *${checkInFormatted}* to *${checkOutFormatted}*.${priceText}
The address is *${apartmentInfo.address}*, *${apartmentInfo.building}*.

If you are *arriving by car*, the garage entrance is located next to Kaldi restaurant.
At the ramp, you need to ring the intercom and mention apartment number *${apartmentInfo.apartment}*,
parking space number *${apartmentInfo.parking}* on level *${apartmentInfo.level}*, and that it's the *${apartmentInfo.building === 'BW Aqua building' ? 'Aqua building' : 'Parkview building'}*.

The keys will be waiting for you at the reception under your name.
Payment is made in cash, and upon your arrival we will arrange
the most convenient time for collecting the payment.

In case you are *not arriving by car*, we can organize
our transport that will take you to the building.
Our driver will hand you the keys and collect the payment on the spot.
The cost of transportation is charged additionally.

We look forward to your arrival and wish you a pleasant stay.`;
}

// Generate Serbian message
function generateSerbianMessage(guestName, checkInFormatted, checkOutFormatted, apartmentInfo, price) {
    const priceText = price ? `\n*Ukupna cena za vaš boravak je ${price}€.*` : '';

    return `Poštovani ${guestName},

Hvala vam na rezervaciji i što ste izabrali naš apartman.
Vaš boravak je potvrđen od *${checkInFormatted}* do *${checkOutFormatted}*.${priceText}
Adresa je *${apartmentInfo.address}*, *${apartmentInfo.building}*.

Ako *dolazite automobilom*, ulaz u garažu se nalazi pored restorana Kaldi.
Na rampi treba da se javite preko interfona i spomenete broj apartmana *${apartmentInfo.apartment}*,
broj parking mesta *${apartmentInfo.parking}* na nivou *${apartmentInfo.level}*, i da se radi o *${apartmentInfo.building === 'BW Aqua building' ? 'Aqua zgradi' : 'Parkview zgradi'}*.

Ključevi će vas čekati na recepciji na vaše ime.
Plaćanje se vrši u gotovini, a po vašem dolasku ćemo se dogovoriti
o najpovoljnijem vremenu za preuzimanje uplate.

U slučaju da *ne dolazite automobilom*, možemo organizovati
naš prevoz koji će vas dovesti do zgrade.
Naš vozač će vam predati ključeve i preuzeti uplatu na licu mesta.
Cena prevoza se dodatno naplaćuje.

Radujemo se vašem dolasku i želimo vam prijatan boravak.`;
}
