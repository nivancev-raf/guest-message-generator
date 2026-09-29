// "My profile" view: display name used in the greeting

function enterProfileView() {
    document.getElementById('profileEmail').textContent = currentUser ? currentUser.email : '';
    document.getElementById('profileName').value = (currentProfile && currentProfile.display_name) || '';
    document.getElementById('profileName').classList.remove('required');
    setProfileStatus('');
}

async function saveProfile(event) {
    event.preventDefault();
    const nameInput = document.getElementById('profileName');
    const displayName = nameInput.value.trim();

    if (!displayName) {
        nameInput.classList.add('required');
        setProfileStatus('Please enter your name.', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
        currentProfile = await updateProfile(currentUser.id, { display_name: displayName });
        updateGreeting();
        setProfileStatus('Profile saved.', 'success');
    } catch (error) {
        console.error('Saving profile failed', error);
        setProfileStatus('Saving failed. Check your internet connection and try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save profile';
    }
}

function setProfileStatus(message, type = 'info') {
    const status = document.getElementById('profileStatus');
    status.textContent = message;
    status.className = `editor-status ${type}`;
    status.style.display = message ? 'block' : 'none';
}

function initProfile() {
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('profileName').addEventListener('input', () => {
        document.getElementById('profileName').classList.remove('required');
        setProfileStatus('');
    });
    registerViewHooks('profile', { enter: enterProfileView });
}
