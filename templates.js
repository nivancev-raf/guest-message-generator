// Message templates and placeholder rendering
//
// Every apartment can override any template in its `templates` column (see supabase/schema.sql):
// { "sr": { "reservation": "...", "reservation_no_transport": "...", "garage": "..." }, "en": { ... } }
// Anything that is not overridden falls back to DEFAULT_TEMPLATES below.

const TEMPLATE_KEYS = ['reservation', 'reservation_no_transport', 'garage'];

const TEMPLATE_LABELS = {
    reservation: 'Reservation message (with transport)',
    reservation_no_transport: 'Reservation message (without transport)',
    garage: 'Garage info'
};

// Placeholders available in every template
const TEMPLATE_PLACEHOLDERS = [
    { key: 'guest_name', description: 'Guest name' },
    { key: 'check_in', description: 'Check-in date' },
    { key: 'check_out', description: 'Check-out date' },
    { key: 'price', description: 'Reservation price' },
    { key: 'location', description: 'Full location (address, building, entrance, floor, apartment)' },
    { key: 'address', description: 'Street address' },
    { key: 'building', description: 'Building' },
    { key: 'apartment', description: 'Apartment number' },
    { key: 'entrance', description: 'Entrance' },
    { key: 'floor', description: 'Floor' },
    { key: 'parking', description: 'Parking spot' },
    { key: 'garage_level', description: 'Garage level' }
];

// Generic templates without any apartment specific details
const DEFAULT_TEMPLATES = {
    sr: {
        reservation: `Poštovani/a {{guest_name}},

Hvala vam na rezervaciji i što ste izabrali naš apartman.

Vaš boravak je potvrđen od *{{check_in}}* do *{{check_out}}*, po ceni od *{{price}}€*.
Adresa apartmana:
{{location}}.

Check-in: od *15:00h*
Check-out: do *11:00h*.

*Plaćanje* se vrši u gotovini, prilikom dolaska u apartman.
Ukoliko dolazite automobilom, garažno mesto se doplačuje *10€ po danu*.
Organizujemo prevoz od i do aerodroma koji se naplaćuje u zavisnosti od termina i broja osoba.

Radujemo se vašem dolasku i želimo vam prijatan boravak u našem gradu!`,
        reservation_no_transport: `Poštovani/a {{guest_name}},

Hvala vam na rezervaciji i što ste izabrali naš apartman.

Vaš boravak je potvrđen od {{check_in}} do {{check_out}}, po ceni od *{{price}}€*.
Adresa apartmana:
{{location}}.

Check-in je od 15:00h, a check-out do 11:00h.

Plaćanje se vrši u gotovini, pri dolasku u apartman.

Ako dolazite automobilom, garažno mesto se doplačuje 10€ po danu.

Radujemo se vašem dolasku i želimo vam prijatan boravak u našem gradu!`,
        garage: `🅿️ Informacije o parkingu

Parking mesto *{{parking}}* na nivou *{{garage_level}}*.
Stan *{{apartment}}*, *{{address}}*.

Karticu za garažu preuzimate sa ključevima od stana.`
    },
    en: {
        reservation: `Dear {{guest_name}},

Thank you for your reservation and for choosing our apartment.

Your stay is confirmed from *{{check_in}}* to *{{check_out}}*, at the price of *{{price}}€*.
Apartment address:
{{location}}.

Check-in: from *3:00 PM*
Check-out: until *11:00 AM*.

*Payment* is made in cash, upon arrival at the apartment.
If you are arriving by car, parking space is charged additionally *10€ per day*.
We organize transport to and from the airport which is charged depending on the schedule and number of people.

We look forward to your arrival and wish you a pleasant stay in our city!`,
        reservation_no_transport: `Dear {{guest_name}},

Thank you for your reservation and for choosing our apartment.

Your stay is confirmed from *{{check_in}}* to *{{check_out}}*, at the price of *{{price}}€*.
Apartment address:
{{location}}.

Check-in is from 3:00 PM, and check-out until 11:00 AM.

Payment is made in cash, upon arrival at the apartment.

If you are arriving by car, parking space is charged additionally 10€ per day.

We look forward to your arrival and wish you a pleasant stay in our city!`,
        garage: `🅿️ Parking Information

Parking space *{{parking}}* on level *{{garage_level}}*.
Apartment *{{apartment}}*, *{{address}}*.

You will pick up the garage card together with the apartment keys.`
    }
};

// Get the template for an apartment, falling back to the default one
function getTemplate(apartment, language, key) {
    const custom = apartment && apartment.templates && apartment.templates[language];
    if (custom && typeof custom[key] === 'string' && custom[key].trim()) {
        return custom[key];
    }
    return DEFAULT_TEMPLATES[language][key];
}

// Check whether an apartment has its own (non default) template
function hasCustomTemplate(apartment, language, key) {
    const custom = apartment && apartment.templates && apartment.templates[language];
    return !!(custom && typeof custom[key] === 'string' && custom[key].trim());
}

// Replace {{placeholder}} values; unknown placeholders are left untouched
function renderTemplate(template, vars) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
    });
}

// Build a readable location line from the apartment fields that are filled in
function buildLocation(apartment, language) {
    const labels = language === 'sr'
        ? { entrance: 'ulaz', floor: 'sprat', apartment: 'stan' }
        : { entrance: 'entrance', floor: 'floor', apartment: 'apartment' };

    const parts = [];
    if (apartment.address) parts.push(`*${apartment.address}*`);
    if (apartment.building) parts.push(`*${apartment.building}*`);
    if (apartment.entrance) parts.push(`${labels.entrance} *${apartment.entrance}*`);
    if (apartment.floor) parts.push(`${labels.floor} *${apartment.floor}*`);
    if (apartment.apartment_number) parts.push(`${labels.apartment} *${apartment.apartment_number}*`);
    return parts.join(', ');
}

// Values for all placeholders; guest specific values are passed in `guest`
function buildTemplateVars(apartment, language, guest = {}) {
    return {
        guest_name: guest.guestName || '',
        check_in: guest.checkIn ? formatDate(guest.checkIn, language) : '',
        check_out: guest.checkOut ? formatDate(guest.checkOut, language) : '',
        price: guest.price || '',
        location: buildLocation(apartment, language),
        address: apartment.address || '',
        building: apartment.building || '',
        apartment: apartment.apartment_number || '',
        entrance: apartment.entrance || '',
        floor: apartment.floor || '',
        parking: apartment.parking_spot || '',
        garage_level: apartment.garage_level || ''
    };
}

// Generate a message of the given type for an apartment
function generateFromTemplate(apartment, language, key, guest) {
    const template = getTemplate(apartment, language, key);
    return renderTemplate(template, buildTemplateVars(apartment, language, guest));
}
