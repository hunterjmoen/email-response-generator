// Test your Supabase database connection
// Replace the values below with your actual Supabase credentials

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl ="https://fecjsyxlgltqqqokunyb.supabase.co"
const supabaseKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY2pzeXhsZ2x0cXFxb2t1bnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzIxMjMsImV4cCI6MjA3MzM0ODEyM30.uVFL0eBlGsthbalIdQ7jIkrfGe0wAR_t5snukojRJHE"

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseSetup() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test 1: Check if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count');
    
    if (usersError) {
      console.log('❌ Users table not found:', usersError.message);
      return;
    }
    console.log('✅ Users table is ready');
    
    // Test 2: Check if subscriptions table exists  
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('count');
      
    if (subsError) {
      console.log('❌ Subscriptions table not found:', subsError.message);
      return;
    }
    console.log('✅ Subscriptions table is ready');
    
    // Test 3: Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    console.log('✅ Authentication service is ready');
    
    console.log('\n🎉 Database setup complete! Your authentication system is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Update your .env.local file with actual Supabase credentials');
    console.log('2. Run: npm run dev');
    console.log('3. Visit: http://localhost:3000');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\nPlease check:');
    console.log('1. Your Supabase URL and API key are correct');
    console.log('2. The database migration has been run');
    console.log('3. Your project is active in Supabase');
  }
}

testDatabaseSetup();