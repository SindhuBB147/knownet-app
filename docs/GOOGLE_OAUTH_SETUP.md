# Google OAuth Setup Instructions

To enable Google authentication for the signup page, follow these steps:

## 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Identity Services** API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Identity Services API"
   - Click "Enable"

## 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the OAuth consent screen if prompted
4. For Application type, select "Web application"
5. Add your authorized JavaScript origins:
   - For local development: `http://localhost:3000`, `http://127.0.0.1:3000`
   - For production: `https://yourdomain.com`
6. Click "Create"

## 3. Configure Your Application

1. Copy your Client ID from the Google Cloud Console
2. Open `google-config.js` in your project
3. Replace `'YOUR_GOOGLE_CLIENT_ID'` with your actual Client ID

Example:
```javascript
const GOOGLE_CONFIG = {
    CLIENT_ID: '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'
};
```

## 4. Test the Integration

1. Open `kn_signup.html` in your browser
2. Click "Continue with Google"
3. The Google sign-in popup should appear
4. After successful authentication, user info will be logged to the console

## 5. Backend Integration (For Production)

For a production application, you should:

1. Verify the JWT token on your backend server
2. Create user accounts in your database
3. Implement proper session management
4. Handle user data securely

## Troubleshooting

- **Error: "Not a valid origin"**: Make sure your domain is added to authorized JavaScript origins
- **No popup appears**: Check browser console for errors and ensure the Google library is loaded
- **Token verification fails**: Verify your Client ID is correct and the token is valid

## Security Notes

- Never expose your Client Secret in frontend code
- Always verify tokens on the backend
- Use HTTPS in production
- Implement proper CORS policies