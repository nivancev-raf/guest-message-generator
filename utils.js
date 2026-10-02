// Date and text formatting utilities

// Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Format date to readable format (e.g., "January 15th")
function formatDate(dateString, language = 'en') {
    const date = new Date(dateString);
    
    if (language === 'sr') {
        const months = [
            'januara', 'februara', 'marta', 'aprila', 'maja', 'juna',
            'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'
        ];
        const month = months[date.getMonth()];
        const day = date.getDate();
        return `${day}. ${month}`;
    } else {
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        const day = date.getDate();
        const suffix = getOrdinalSuffix(day);
        return `${month} ${day}${suffix}`;
    }
}
