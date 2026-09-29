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

    if (apartments.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'You have no apartments yet. Add your first one.';
        list.appendChild(empty);
        return;
    }

    apartments.forEach(apartment => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'apartment-card';
        card.addEventListener('click', () => openApartmentForm(apartment.id));

        const name = document.createElement('div');
        name.className = 'apartment-card-name';
        name.textContent = apartment.name;

        const details = document.createElement('div');
        details.className = 'apartment-card-details';
        details.textContent = [apartment.building, apartment.address, apartment.apartment_number && `Apt ${apartment.apartment_number}`]
            .filter(Boolean)
            .join(' · ') || 'No details yet';

        const edit = document.createElement('span');
        edit.className = 'apartment-card-edit';
        edit.textContent = 'Edit ›';

        card.appendChild(name);
        card.appendChild(details);
        card.appendChild(edit);
        list.appendChild(card);
    });
}

// Open the form; without an id it adds a new apartment
function openApartmentForm(apartmentId = null) {
    const apartment = apartmentId ? getApartmentById(apartmentId) : null;
    editingApartmentId = apartment ? apartment.id : null;

    if (!showView('apartmentForm')) return;

    document.getElementById('apartmentFormTitle').textContent = apartment ? `Edit ${apartment.name}` : 'Add apartment';
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
