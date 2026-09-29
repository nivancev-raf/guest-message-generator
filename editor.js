// Message template editor (per apartment, per language)

const EDITOR_LANGUAGES = ['sr', 'en'];

let editorApartmentId = null;
let editorLanguage = 'sr';
let editorDraft = null;         // { sr: { reservation: '...', ... }, en: { ... } }
let editorInitialDraft = null;  // snapshot used to detect unsaved changes
let editorActiveTextarea = null;

// Open the editor for the selected apartment
function openTemplateEditor() {
    const apartment = getSelectedApartment();
    if (!apartment) return;

    editorApartmentId = apartment.id;
    editorDraft = {};
    EDITOR_LANGUAGES.forEach(language => {
        editorDraft[language] = {};
        TEMPLATE_KEYS.forEach(key => {
            editorDraft[language][key] = getTemplate(apartment, language, key);
        });
    });
    editorInitialDraft = JSON.stringify(editorDraft);

    document.getElementById('editorTitle').textContent = `Edit messages – ${apartment.name}`;
    setEditorStatus('');
    renderPlaceholderChips();

    const selectedLanguage = document.querySelector('input[name="language"]:checked').value;
    switchEditorLanguage(selectedLanguage, false);

    document.getElementById('templateEditor').style.display = 'flex';
    document.body.classList.add('editor-open');
}

function closeTemplateEditor(force = false) {
    if (!force && editorDraft) {
        storeEditorFields();
        if (JSON.stringify(editorDraft) !== editorInitialDraft && !confirm('Discard unsaved changes?')) {
            return;
        }
    }
    document.getElementById('templateEditor').style.display = 'none';
    document.body.classList.remove('editor-open');
    editorApartmentId = null;
    editorDraft = null;
    editorActiveTextarea = null;
}

// Copy textarea values into the draft for the current language
function storeEditorFields() {
    if (!editorDraft) return;
    document.querySelectorAll('#editorFields textarea').forEach(textarea => {
        editorDraft[editorLanguage][textarea.dataset.key] = textarea.value;
    });
}

function switchEditorLanguage(language, storeCurrent = true) {
    if (storeCurrent) storeEditorFields();
    editorLanguage = language;

    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.lang === language);
    });
    renderEditorFields();
}

function renderEditorFields() {
    const container = document.getElementById('editorFields');
    container.innerHTML = '';
    editorActiveTextarea = null;

    TEMPLATE_KEYS.forEach(key => {
        const field = document.createElement('div');
        field.className = 'editor-field';

        const header = document.createElement('div');
        header.className = 'editor-field-header';

        const label = document.createElement('label');
        label.htmlFor = `template_${key}`;
        label.textContent = TEMPLATE_LABELS[key];

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'editor-reset-btn';
        resetBtn.textContent = 'Reset to default';

        const textarea = document.createElement('textarea');
        textarea.id = `template_${key}`;
        textarea.dataset.key = key;
        textarea.rows = key === 'garage' ? 8 : 14;
        textarea.value = editorDraft[editorLanguage][key];
        textarea.addEventListener('focus', () => { editorActiveTextarea = textarea; });

        resetBtn.addEventListener('click', () => {
            textarea.value = DEFAULT_TEMPLATES[editorLanguage][key];
            editorActiveTextarea = textarea;
        });

        header.appendChild(label);
        header.appendChild(resetBtn);
        field.appendChild(header);
        field.appendChild(textarea);
        container.appendChild(field);
    });
}

function renderPlaceholderChips() {
    const container = document.getElementById('placeholderChips');
    container.innerHTML = '';
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
    const textarea = editorActiveTextarea;
    if (!textarea) {
        setEditorStatus('Tap inside a message first, then tap a placeholder.', 'error');
        return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    setEditorStatus('');
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

    storeEditorFields();
    const saveBtn = document.getElementById('saveTemplatesBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const updated = await updateApartmentTemplates(apartment.id, buildTemplatesToSave(apartment.templates));
        apartments = apartments.map(item => item.id === updated.id ? updated : item);
        closeTemplateEditor(true);
    } catch (error) {
        console.error('Saving templates failed', error);
        setEditorStatus('Saving failed. Check your internet connection and try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

function setEditorStatus(message, type = 'info') {
    const status = document.getElementById('editorStatus');
    status.textContent = message;
    status.className = `editor-status ${type}`;
    status.style.display = message ? 'block' : 'none';
}
