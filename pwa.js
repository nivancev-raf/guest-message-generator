// PWA (Progressive Web App) functionality

let deferredPrompt;

// Initialize PWA features
function initializePWA() {
    // Handle install prompt (silently, without showing UI)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Don't show the install prompt UI anymore
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/guest-message-generator/sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// Install PWA (keep for potential future use)
function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            }
            deferredPrompt = null;
        });
    }
}

// Dismiss install prompt (no longer needed but keeping for compatibility)
function dismissInstall() {
    // Function kept for compatibility but no longer shows UI
}
