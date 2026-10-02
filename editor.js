// Templates view: one template at a time, chosen by apartment + language + message type

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
    setEditorStatus(hasApartments ? '' : 'Add an apartment first (Apartments → Add).', 'info');

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
        updateTemplateBadge();
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

// "Custom" badge and "Reset to default" are shown only for templates that differ from the default
function updateTemplateBadge() {
    const isCustom = !!editorDraft &&
        editorDraft[getEditorLanguage()][getEditorType()] !== DEFAULT_TEMPLATES[getEditorLanguage()][getEditorType()];
    document.getElementById('msgTemplateBadge').style.display = isCustom ? 'inline-block' : 'none';
    document.getElementById('msgResetBtn').style.display = isCustom ? 'inline-block' : 'none';
}

function hasUnsavedTemplates() {
    if (!editorDraft) return false;
    storeEditorTemplate();
    return JSON.stringify(editorDraft) !== editorInitialDraft;
}

function confirmDiscardTemplates() {
    return !hasUnsavedTemplates() || confirm('You have unsaved message changes. Discard them?');
}

// Variable picker: chips with readable labels, the raw token is in the title
function renderPlaceholderChips() {
    const container = document.getElementById('placeholderChips');
    if (container.childElementCount > 0) return;

    TEMPLATE_PLACEHOLDER_GROUPS.forEach(groupName => {
        const group = document.createElement('div');
        group.className = 'variable-group';

        const label = document.createElement('span');
        label.className = 'variable-group-label';
        label.textContent = groupName;

        const chips = document.createElement('div');
        chips.className = 'variable-chips';

        TEMPLATE_PLACEHOLDERS.filter(placeholder => placeholder.group === groupName).forEach(placeholder => {
            const token = `{{${placeholder.key}}}`;
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'variable-chip';
            chip.title = token;

            const plus = document.createElement('span');
            plus.className = 'variable-chip-plus';
            plus.textContent = '+';
            chip.appendChild(plus);
            chip.appendChild(document.createTextNode(placeholder.label));

            // Keep focus (and cursor position) in the textarea
            chip.addEventListener('mousedown', event => event.preventDefault());
            chip.addEventListener('click', () => insertPlaceholder(token));
            chips.appendChild(chip);
        });

        group.appendChild(label);
        group.appendChild(chips);
        container.appendChild(group);
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
        setEditorStatus(`Templates for ${updated.name} saved`, 'success');
    } catch (error) {
        console.error('Saving templates failed', error);
        setEditorStatus('Saving failed. Check your internet connection and try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save template';
    }
}

function setEditorStatus(message, type = 'info') {
    const status = document.getElementById('msgStatus');
    status.innerHTML = type === 'success' ? CHECK_ICON : '';
    status.appendChild(document.createTextNode(message));
    status.className = `status-line ${type}`;
    status.style.display = message ? 'flex' : 'none';
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
