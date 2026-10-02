// Apartment management: list, add, edit, delete

// Form input id -> apartment column
const APARTMENT_FORM_FIELDS = {
    aptName: 'name',
    aptBuilding: 'building',
    aptAddress: 'address',
    aptNumber: 'apartment_number',
    aptEntrance: 'entrance',
    aptFloor: 'floor',
    aptParking: 'parking_spot',
    aptGarageLevel: 'garage_level'
};

let editingApartmentId = null; // null = adding a new apartment

function renderApartmentList() {
    const list = document.getElementById('apartmentList');
    list.innerHTML = '';
    document.getElementById('apartmentCount').textContent =
        `${apartments.length} ${apartments.length === 1 ? 'APARTMENT' : 'APARTMENTS'}`;

    if (apartments.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'You have no apartments yet. Tap Add to create your first one.';
        list.appendChild(empty);
        return;
    }

    apartments.forEach(apartment => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'apartment-row';
        row.addEventListener('click', () => openApartmentForm(apartment.id));

        const tile = document.createElement('span');
        tile.className = 'apartment-tile';
        tile.textContent = apartment.apartment_number || apartment.name.charAt(0).toUpperCase();

        const text = document.createElement('span');
        text.className = 'apartment-row-text';

        const name = document.createElement('span');
        name.className = 'apartment-row-name';
        name.textContent = apartment.name;

        let parking = '';
        if (apartment.parking_spot) {
            parking = `P${apartment.parking_spot}${apartment.garage_level ? `, L${apartment.garage_level}` : ''}`;
        }
        const meta = document.createElement('span');
        meta.className = 'apartment-row-meta';
        meta.textContent = [apartment.building, apartment.address, parking].filter(Boolean).join(' · ') || 'No details yet';

        text.appendChild(name);
        text.appendChild(meta);

        row.appendChild(tile);
        row.appendChild(text);
        row.insertAdjacentHTML('beforeend',
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39B8B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>');
        list.appendChild(row);
    });
}

// Open the form; without an id it adds a new apartment
function openApartmentForm(apartmentId = null) {
    const apartment = apartmentId ? getApartmentById(apartmentId) : null;
    editingApartmentId = apartment ? apartment.id : null;

    if (!showView('apartmentForm')) return;

    setTopbar(apartment ? 'Edit apartment' : 'Add apartment');
    Object.entries(APARTMENT_FORM_FIELDS).forEach(([inputId, column]) => {
        document.getElementById(inputId).value = (apartment && apartment[column]) || '';
    });
    document.getElementById('deleteApartmentBtn').style.display = apartment ? 'block' : 'none';
    document.getElementById('aptName').classList.remove('required');
    setApartmentFormError('');
}

function readApartmentForm() {
    const values = {};
    Object.entries(APARTMENT_FORM_FIELDS).forEach(([inputId, column]) => {
        const value = document.getElementById(inputId).value.trim();
        values[column] = value || null;
    });
    return values;
}

function setApartmentFormError(message) {
    const error = document.getElementById('apartmentFormError');
    error.textContent = message;
    error.style.display = message ? 'block' : 'none';
}

async function saveApartment(event) {
    event.preventDefault();
    const values = readApartmentForm();

    if (!values.name) {
        document.getElementById('aptName').classList.add('required');
        setApartmentFormError('Please enter a name for the apartment.');
        return;
    }
    const duplicate = apartments.find(item => item.id !== editingApartmentId && item.name.toLowerCase() === values.name.toLowerCase());
    if (duplicate) {
        document.getElementById('aptName').classList.add('required');
        setApartmentFormError('You already have an apartment with this name.');
        return;
    }

    const saveBtn = document.getElementById('saveApartmentBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
        if (editingApartmentId) {
            const updated = await updateApartment(editingApartmentId, values);
            apartments = apartments.map(item => item.id === updated.id ? updated : item);
        } else {
            const maxOrder = apartments.reduce((max, item) => Math.max(max, item.sort_order || 0), 0);
            const created = await createApartment({ ...values, sort_order: maxOrder + 10 });
            apartments = [...apartments, created];
        }
        refreshApartmentSelects();
        showView('apartments');
    } catch (error) {
        console.error('Saving apartment failed', error);
        setApartmentFormError('Saving failed. Check your internet connection and try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save apartment';
    }
}

async function removeApartment() {
    const apartment = getApartmentById(editingApartmentId);
    if (!apartment) return;
    if (!confirm(`Delete "${apartment.name}"? Its custom messages will be deleted too. This cannot be undone.`)) {
        return;
    }

    const deleteBtn = document.getElementById('deleteApartmentBtn');
    deleteBtn.disabled = true;
    try {
        await deleteApartment(apartment.id);
        apartments = apartments.filter(item => item.id !== apartment.id);
        // The database clears the default apartment when it is deleted
        if (currentProfile && currentProfile.default_apartment_id === apartment.id) {
            currentProfile = { ...currentProfile, default_apartment_id: null };
        }
        refreshApartmentSelects();
        showView('apartments');
    } catch (error) {
        console.error('Deleting apartment failed', error);
        setApartmentFormError('Deleting failed. Check your internet connection and try again.');
    } finally {
        deleteBtn.disabled = false;
    }
}

// Keep the generator dropdown in sync after changes
function refreshApartmentSelects() {
    const select = document.getElementById('apartmentSelect');
    const selectedId = select.value;
    populateApartmentSelect();
    select.value = getApartmentById(selectedId) ? selectedId : getDefaultApartmentId();
    updateApartmentInfo();
    updateButtonStates();
}

function initApartments() {
    document.getElementById('apartmentForm').addEventListener('submit', saveApartment);
    document.getElementById('deleteApartmentBtn').addEventListener('click', removeApartment);
    document.getElementById('aptName').addEventListener('input', () => {
        document.getElementById('aptName').classList.remove('required');
        setApartmentFormError('');
    });
    registerViewHooks('apartments', { enter: renderApartmentList });
}
