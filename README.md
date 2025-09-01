# Guest Message Generator

A Progressive Web App (PWA) for generating personalized messages for apartment guests. This app helps property managers create standardized welcome messages with specific apartment details, parking information, and check-in instructions.

## 🌐 Live Demo

Visit the app: [https://nivancev-raf.github.io/guest-message-generator/](https://nivancev-raf.github.io/guest-message-generator/)

## ✨ Features

- **Apartment Selection**: Choose from multiple apartment buildings and units
- **Guest Information**: Input guest name, phone number, and stay dates
- **Message Generation**: Automatically generate personalized welcome messages
- **WhatsApp Integration**: Send messages directly via WhatsApp
- **PWA Support**: Install as a mobile app with offline functionality
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 📱 Installation

### As a Web App
- Visit the URL in any modern browser
- On mobile devices, you can "Add to Home Screen" for app-like experience

### Local Development
1. Clone the repository
2. Open `index.html` in a web browser
3. For development with a local server: `python -m http.server 8000` or use Live Server extension in VS Code

## 🏗️ Project Structure

```
├── index.html          # Main HTML file
├── styles.css          # All CSS styles and responsive design
├── app.js              # Main application logic and DOM manipulation
├── data.js             # Apartment data configuration
├── utils.js            # Utility functions (date formatting, message generation)
├── pwa.js              # Progressive Web App functionality
├── sw.js               # Service Worker for offline functionality
├── manifest.json       # PWA manifest file
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
└── README.md           # Project documentation
```

## 🔧 File Descriptions

### Core Files
- **`index.html`**: Main HTML structure and form elements
- **`styles.css`**: Complete styling including responsive design for mobile devices
- **`app.js`**: Main application logic, form validation, and user interactions

### Data & Utilities
- **`data.js`**: Contains apartment information (addresses, parking details, etc.)
- **`utils.js`**: Helper functions for date formatting and message generation

### PWA Components
- **`pwa.js`**: Progressive Web App features (installation prompt, service worker registration)
- **`sw.js`**: Service Worker for caching and offline functionality
- **`manifest.json`**: PWA manifest defining app metadata and behavior

## 🏢 Supported Apartments

- **Aqua Building** (Hercegovačka 23)
  - Apartment 2108 (Parking: 376, Level -2)
  - Apartment 706 (Parking: 49, Level -1)
  - Apartment 707 (Parking: 48, Level -1)

- **Parkview Building** (Bulevar Vudroa Vilsona 8)
  - Apartment 2110 (Parking: 22, Level -1)

## 🛠️ Adding New Apartments

To add new apartments, edit the `data.js` file:

```javascript
const apartmentData = {
    newApartmentKey: {
        building: "Building Name",
        apartment: "Unit Number",
        parking: "Parking Slot",
        level: "Parking Level",
        address: "Full Address"
    }
};
```

Then add the new option to the select element in `index.html`.

## 📋 Usage

1. **Select Apartment**: Choose from the dropdown list
2. **Enter Guest Details**: Fill in guest name and mobile number (with country code)
3. **Set Dates**: Select check-in and check-out dates
4. **Generate Message**: Click "Generate Message" to create the personalized text
5. **Send Message**: Use one of the WhatsApp options or copy to clipboard

## 🌍 Browser Support

- Chrome/Chromium (recommended)
- Safari (iOS and macOS)
- Firefox
- Edge

## 🔄 Updates

The app automatically updates when new versions are deployed. The service worker handles caching and ensures offline functionality.

## 📄 License

This project is for personal/business use. Feel free to modify according to your needs.