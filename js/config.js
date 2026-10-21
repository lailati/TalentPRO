// Backend switch.
//   'gas'   -> Google Apps Script web app + Google Sheets (see backend/README.md). Shared, live data.
//   'local' -> in-browser demo backend (localStorage + IndexedDB). Private sandbox per visitor.
// The UI only ever talks to js/api.js, so neither the UI nor the later swap to SQL changes.
// Append ?backend=local to the page URL to open the sandbox without editing this file.
const forced = new URLSearchParams(location.search).get('backend');
export const CONFIG = {
  backend: forced === 'local' || forced === 'gas' ? forced : 'gas',
  gasUrl: 'https://script.google.com/macros/s/AKfycbzuPX2daurPD3T8nUFpsrYr8B0HxA04NPN4C6eXafYGbOy6rW8h9R74zz3nI5MXBJQw/exec',
  appName: 'FSTP Talent Map',
};
