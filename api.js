// Data access layer - all database reads/writes go through here

const APARTMENT_COLUMNS = 'id, name, building, address, apartment_number, entrance, floor, parking_spot, garage_level, sort_order, templates';

// Profile of the logged in user (display name, default apartment)
async function fetchProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, display_name, default_apartment_id')
        .eq('id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// Apartments of the logged in user (RLS returns only their own)
async function fetchApartments() {
    const { data, error } = await supabaseClient
        .from('apartments')
        .select(APARTMENT_COLUMNS)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
}

// Save custom message templates for an apartment
async function updateApartmentTemplates(apartmentId, templates) {
    const { data, error } = await supabaseClient
        .from('apartments')
        .update({ templates })
        .eq('id', apartmentId)
        .select(APARTMENT_COLUMNS)
        .single();
    if (error) throw error;
    return data;
}

// --- Prepared for future apartment management (not used in the UI yet) ---

async function createApartment(apartment) {
    const { data, error } = await supabaseClient
        .from('apartments')
        .insert(apartment)
        .select(APARTMENT_COLUMNS)
        .single();
    if (error) throw error;
    return data;
}

async function updateApartment(apartmentId, changes) {
    const { data, error } = await supabaseClient
        .from('apartments')
        .update(changes)
        .eq('id', apartmentId)
        .select(APARTMENT_COLUMNS)
        .single();
    if (error) throw error;
    return data;
}

async function deleteApartment(apartmentId) {
    const { error } = await supabaseClient
        .from('apartments')
        .delete()
        .eq('id', apartmentId);
    if (error) throw error;
}
