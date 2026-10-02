// Profile view: display name (used in the greeting) and log out

function renderProfileIdentity() {
    const name = getDisplayName();
    const email = currentUser ? currentUser.email : '';
    document.getElementById('profileAvatar').textContent = name.trim().charAt(0).toUpperCase();
    document.getElementById('profileDisplayName').textContent = name;
    document.getElementById('profileEmail').textContent = email;
}

function enterProfileView() {
    renderProfileIdentity();
    document.getElementById('profileEmailInput').value = currentUser ? currentUser.email : '';
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
        renderProfileIdentity();
        setProfileStatus('Profile saved', 'success');
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
    status.innerHTML = type === 'success' ? CHECK_ICON : '';
    status.appendChild(document.createTextNode(message));
    status.className = `status-line ${type}`;
    status.style.display = message ? 'flex' : 'none';
}

function initProfile() {
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('profileName').addEventListener('input', () => {
        document.getElementById('profileName').classList.remove('required');
        setProfileStatus('');
    });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    registerViewHooks('profile', { enter: enterProfileView });
}
