/**
 * config.js
 * ─────────────────────────────────────────────────────────────
 * Google API credentials for the Google Sheets export feature.
 *
 * HOW TO SET UP:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project (or pick an existing one).
 * 3. Enable the "Google Sheets API" and "Google Drive API".
 * 4. Create an OAuth 2.0 Client ID (Web Application).
 *    - Add your site's origin to "Authorised JavaScript origins"
 *      e.g. http://localhost:5500 for local dev.
 * 5. Create an API Key and restrict it to Sheets + Drive APIs.
 * 6. Paste both values below.
 *
 * SCOPES granted:
 *   - spreadsheets        → create & write sheets
 *   - drive.file          → only files created by this app
 * ─────────────────────────────────────────────────────────────
 */

const GCONFIG = {
  CLIENT_ID:  'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com',
  API_KEY:    'YOUR_API_KEY',
  SCOPES:     'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  DISCOVERY:  'https://sheets.googleapis.com/$discovery/rest?version=v4',
};
