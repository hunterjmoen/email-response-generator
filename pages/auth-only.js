import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AuthOnly() {
  const [status, setStatus] = useState('Ready to test...');
  const [user, setUser] = useState(null);

  const testBasicSignUp = async () => {
    setStatus('Testing basic sign up...');
    
    const email = 'test+' + Date.now() + '@example.com'; // Unique email
    const password = 'testpassword123';
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      
      if (error) {
        setStatus('❌ Sign up failed: ' + error.message);
      } else {
        setStatus('✅ Sign up successful! User ID: ' + data.user?.id);
        console.log('Sign up data:', data);
      }
    } catch (err) {
      setStatus('❌ Unexpected error: ' + err.message);
      console.error(err);
    }
  };

  const testSignIn = async () => {
    setStatus('Testing sign in...');
    
    const email = prompt('Enter email to sign in:');
    const password = prompt('Enter password:');
    
    if (!email || !password) return;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (error) {
        setStatus('❌ Sign in failed: ' + error.message);
      } else {
        setStatus('✅ Sign in successful!');
        setUser(data.user);
      }
    } catch (err) {
      setStatus('❌ Unexpected error: ' + err.message);
      console.error(err);
    }
  };

  const testConnection = async () => {
    setStatus('Testing connection...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setStatus('✅ Connection working! Session: ' + (session ? 'Active' : 'None'));
    } catch (err) {
      setStatus('❌ Connection failed: ' + err.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStatus('Signed out successfully');
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Auth-Only Debug Test</h1>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <strong>Status:</strong> {status}
      </div>

      {user ? (
        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
          <h2>✅ Signed In</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div style={{ padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
          <h2>🧪 Test Basic Auth</h2>
          <p>This tests ONLY Supabase Auth (no custom tables)</p>
          <div>
            <button 
              onClick={testBasicSignUp} 
              style={{ 
                padding: '10px 15px', 
                margin: '5px', 
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Test Auto Sign Up
            </button>
            <button 
              onClick={testSignIn}
              style={{ 
                padding: '10px 15px', 
                margin: '5px', 
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Test Manual Sign In
            </button>
            <button 
              onClick={testConnection}
              style={{ 
                padding: '10px 15px', 
                margin: '5px', 
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Test Connection
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Debug Info:</strong></p>
        <p>• This page only tests Supabase Auth</p>
        <p>• No custom database tables involved</p>
        <p>• Check browser console for detailed logs</p>
        <p>• &quot;Test Auto Sign Up&quot; creates a test user automatically</p>
      </div>
    </div>
  );
}