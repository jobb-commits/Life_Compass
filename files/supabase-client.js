const SUPABASE_URL = 'https://betgtqczetqwlhmjqjlh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldGd0cWN6ZXRxd2xobWpxamxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTM5NzksImV4cCI6MjEwMzA2OTk3OX0.ToQRtf9eZy0q7Fdvp0IdrUoTDxrEuwtPWmd4bZkF7Hg';
function loadSupabaseSdk(callback) {
  if (window.supabase) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  script.onload = callback;
  script.onerror = () => console.error('Failed to load Supabase SDK. Check your network/CSP.');
  document.head.appendChild(script);
}

window.supabaseReady = new Promise((resolve) => {
  loadSupabaseSdk(() => {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    resolve(window.supabaseClient);
  });
});
