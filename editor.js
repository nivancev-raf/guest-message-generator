// "Edit messages" view: one template at a time, chosen by apartment + language + message type

const EDITOR_LANGUAGES = ['sr', 'en'];

let editorApartmentId = null;
let editorDraft = null;         // { sr: { reservation: '...', ... }, en: { ... } } for the chosen apartment
let editorInitialDraft = null;  // snapshot used to detect unsaved changes

function getEditorLanguage() {
    return document.querySelector('input[name="msgLanguage"]:checked').value;
}

function getEditorType() {
    return document.querySelector('input[name="msgType"]:checked').value;
}

// Shortcut from the generator: open the view for the selected apartment and language
function openMessagesView() {
    const apartment = getSelectedApartment();
    const language = document.querySelector('input[name="language"]:checked').value;
    showView('messages', { apartmentId: apartment && apartment.id, language });
}

function enterMessagesView(options = {}) {
    if (options.language) {
        document.querySelector(`input[name="msgLanguage"][value="${options.language}"]`).checked = true;
    }

    const select = document.getElementById('msgApartment');
    select.innerHTML = '';
    apartments.forEach(apartment => {
        const option = document.createElement('option');
        option.value = apartment.id;
        option.textContent = apartment.name;
        select.appendChild(option);
    });

    const hasApartments = apartments.length > 0;
    ['msgApartment', 'msgTemplate', 'msgResetBtn', 'saveMessagesBtn'].forEach(id => {
        document.getElementById(id).disabled = !hasApartments;
    });
    setEditorStatus(hasApartments ? '' : 'Add an apartment first (Menu → Add apartment).', 'info');

    renderPlaceholderChips();

    const preferredId = options.apartmentId || editorApartmentId || getDefaultApartmentId();
    const apartmentId = getApartmentById(preferredId) ? preferredId : (hasApartments ? apartments[0].id : null);
    loadEditorApartment(apartmentId);
}

// Load all templates of an apartment into the draft
function loadEditorApartment(apartmentId) {
    const apartment = getApartmentById(apartmentId);
    editorApartmentId = apartment ? apartment.id : null;
    document.getElementById('msgApartment').value = editorApartmentId || '';

    if (!apartment) {
        editorDraft = null;
        editorInitialDraft = null;
        document.getElementById('msgTemplate').value = '';
        document.getElementById('msgTemplateBadge').textContent = '';
        return;
    }

    editorDraft = {};
    EDITOR_LANGUAGES.forEach(language => {
        editorDraft[language] = {};
        TEMPLATE_KEYS.forEach(key => {
            editorDraft[language][key] = getTemplate(apartment, language, key);
        });
    });
    editorInitialDraft = JSON.stringify(editorDraft);
    showEditorTemplate();
}

// Put the draft of the chosen language + type into the textarea
function showEditorTemplate() {
    if (!editorDraft) return;
    const language = getEditorLanguage();
    const key = getEditorType();
    document.getElementById('msgTemplate').value = editorDraft[language][key];
    updateTemplateBadge();
}

function storeEditorTemplate() {
    if (!editorDraft) return;
    editorDraft[getEditorLanguage()][getEditorType()] = document.getElementById('msgTemplate').value;
}

function updateTemplateBadge() {
    const badge = document.getElementById('msgTemplateBadge');
    if (!editorDraft) {
        badge.textContent = '';
        return;
    }
    const language = getEditorLanguage();
    const key = getEditorType();
    const isDefault = editorDraft[language][key] === DEFAULT_TEMPLATES[language][key];
    badge.textContent = isDefault ? 'Default' : 'Custom';
    badge.className = `template-badge ${isDefault ? 'default' : 'custom'}`;
}

function hasUnsavedTemplates() {
    if (!editorDraft) return false;
    storeEditorTemplate();
    return JSON.stringify(editorDraft) !== editorInitialDraft;
}

function confirmDiscardTemplates() {
    return !hasUnsavedTemplates() || confirm('You have unsaved message changes. Discard them?');
}

function renderPlaceholderChips() {
    const container = document.getElementById('placeholderChips');
    if (container.childElementCount > 0) return;
    TEMPLATE_PLACEHOLDERS.forEach(placeholder => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'placeholder-chip';
        chip.textContent = `{{${placeholder.key}}}`;
        chip.title = placeholder.description;
        // Keep focus (and cursor position) in the textarea
        chip.addEventListener('mousedown', event => event.preventDefault());
        chip.addEventListener('click', () => insertPlaceholder(`{{${placeholder.key}}}`));
        container.appendChild(chip);
    });
}

function insertPlaceholder(text) {
    const textarea = document.getElementById('msgTemplate');
    if (textarea.disabled) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    storeEditorTemplate();
    updateTemplateBadge();
}

// Only templates that differ from the defaults are stored,
// so improvements to the defaults still reach apartments that use them
function buildTemplatesToSave(existingTemplates) {
    const templates = JSON.parse(JSON.stringify(existingTemplates || {}));
    EDITOR_LANGUAGES.forEach(language => {
        templates[language] = templates[language] || {};
        TEMPLATE_KEYS.forEach(key => {
            const value = editorDraft[language][key];
            if (!value.trim() || value === DEFAULT_TEMPLATES[language][key]) {
                delete templates[language][key];
            } else {
                templates[language][key] = value;
            }
        });
        if (Object.keys(templates[language]).length === 0) {
            delete templates[language];
        }
    });
    return templates;
}

async function saveTemplates() {
    const apartment = getApartmentById(editorApartmentId);
    if (!apartment) return;

    storeEditorTemplate();
    const saveBtn = document.getElementById('saveMessagesBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const updated = await updateApartmentTemplates(apartment.id, buildTemplatesToSave(apartment.templates));
        apartments = apartments.map(item => item.id === updated.id ? updated : item);
        loadEditorApartment(updated.id);
        setEditorStatus(`Messages for ${updated.name} saved.`, 'success');
    } catch (error) {
        console.error('Saving templates failed', error);
        setEditorStatus('Saving failed. Check your internet connection and try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save messages';
    }
}

function setEditorStatus(message, type = 'info') {
    const status = document.getElementById('msgStatus');
    status.textContent = message;
    status.className = `editor-status ${type}`;
    status.style.display = message ? 'block' : 'none';
}

function initMessagesEditor() {
    const select = document.getElementById('msgApartment');
    select.addEventListener('change', () => {
        if (select.value === editorApartmentId) return;
        if (!confirmDiscardTemplates()) {
            select.value = editorApartmentId;
            return;
        }
        setEditorStatus('');
        loadEditorApartment(select.value);
    });

    // The draft is updated on every keystroke, so switching language/type never loses text
    const textarea = document.getElementById('msgTemplate');
    document.querySelectorAll('input[name="msgLanguage"], input[name="msgType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            showEditorTemplate();
            setEditorStatus('');
        });
    });

    textarea.addEventListener('input', () => {
        storeEditorTemplate();
        updateTemplateBadge();
    });

    document.getElementById('msgResetBtn').addEventListener('click', () => {
        if (!editorDraft) return;
        const language = getEditorLanguage();
        const key = getEditorType();
        textarea.value = DEFAULT_TEMPLATES[language][key];
        storeEditorTemplate();
        updateTemplateBadge();
    });

    document.getElementById('saveMessagesBtn').addEventListener('click', saveTemplates);

    registerViewHooks('messages', {
        enter: enterMessagesView,
        canLeave: confirmDiscardTemplates
    });
}
