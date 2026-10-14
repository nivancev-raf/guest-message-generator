// Authentication (Supabase Auth)
// The session is stored in localStorage and refreshed automatically,
// so the user stays logged in until they log out.

// Links in the confirmation / reset emails come back to this page
const APP_URL = window.location.origin + window.location.pathname;

// Read before the Supabase client consumes the URL hash:
// the reset link carries type=recovery, an expired link carries an error
const authLinkParams = new URLSearchParams(window.location.hash.slice(1));
const isPasswordRecoveryLink = authLinkParams.get('type') === 'recovery';
const authLinkError = authLinkParams.get('error_description');

// null when the Supabase library could not be loaded (e.g. no internet connection)
const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
}

// Returns the session, or null when the email has to be confirmed first
async function signUp(email, password, displayName) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: displayName },
            emailRedirectTo: APP_URL
        }
    });
    if (error) throw error;
    return data.session;
}

async function sendPasswordReset(email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
    if (error) throw error;
}

async function updatePassword(password) {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
}

async function getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data.session;
}

function onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => callback(event, session));
}
