const { createClient } = require('@supabase/supabase-js');

// Replace with your actual credentials
const supabaseUrl ="https://fecjsyxlgltqqqokunyb.supabase.co"
const supabaseKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY2pzeXhsZ2x0cXFxb2t1bnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzIxMjMsImV4cCI6MjA3MzM0ODEyM30.uVFL0eBlGsthbalIdQ7jIkrfGe0wAR_t5snukojRJHE"

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test the connection
    const { data, error } = await supabase.from('users').select('count');
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Database is ready for the authentication system.');
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }
}

testConnection();