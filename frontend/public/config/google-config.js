// Google OAuth Configuration
// 
// To set up Google OAuth for your application:
//
// 1. Go to the Google Cloud Console (https://console.cloud.google.com/)
// 2. Create a new project or select an existing one
// 3. Enable the Google+ API or Google Identity Services
// 4. Go to "Credentials" and create a new OAuth 2.0 Client ID
// 5. Set the authorized JavaScript origins to your domain (e.g., http://localhost:3000)
// 6. Copy your Client ID and replace 'YOUR_GOOGLE_CLIENT_ID' below

const GOOGLE_CONFIG = {
    CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual Google Client ID
    
    // Example of what your Client ID should look like:
    // CLIENT_ID: '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GOOGLE_CONFIG;
} else if (typeof window !== 'undefined') {
    window.GOOGLE_CONFIG = GOOGLE_CONFIG;
}