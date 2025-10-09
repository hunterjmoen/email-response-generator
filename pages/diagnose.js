import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Diagnose() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, message, details = null) => {
    setResults(prev => [...prev, { test, status, message, details, time: new Date().toLocaleTimeString() }]);
  };

  const runDiagnostics = async () => {
    setResults([]);
    setLoading(true);

    // Test 1: Environment Variables
    addResult(
      'Environment Variables', 
      process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
      `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing'}`,
      {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
      }
    );

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      addResult('CRITICAL', '❌', 'Missing environment variables - cannot proceed');
      setLoading(false);
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test 2: Basic Connection
    try {
      const { data, error } = await supabase.auth.getSession();
      addResult('Basic Connection', '✅', 'Supabase client connected successfully', data);
    } catch (err) {
      addResult('Basic Connection', '❌', 'Failed to connect: ' + err.message, err);
      setLoading(false);
      return;
    }

    // Test 3: Auth Settings Check
    try {
      // Try to get auth settings (this will fail if auth is not properly configured)
      const { data, error } = await supabase.auth.getUser();
      addResult('Auth Service', '✅', 'Auth service is accessible', { error: error?.message });
    } catch (err) {
      addResult('Auth Service', '❌', 'Auth service error: ' + err.message, err);
    }

    // Test 4: Try Simple Sign Up with Detailed Error Logging
    try {
      const testEmail = `test.${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      addResult('Test Prep', '🔄', `Attempting sign up with email: ${testEmail}`);

      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (error) {
        addResult('Sign Up Test', '❌', 'Sign up failed: ' + error.message, {
          error: error,
          errorCode: error.status,
          errorDetails: error
        });

        // Common error analysis
        if (error.message.includes('Database error')) {
          addResult('Analysis', '🔍', 'This appears to be a database trigger/RLS issue');
        } else if (error.message.includes('Invalid login credentials')) {
          addResult('Analysis', '🔍', 'Auth configuration issue');
        } else if (error.message.includes('Email not confirmed')) {
          addResult('Analysis', '🔍', 'Email confirmation required');
        }
      } else {
        addResult('Sign Up Test', '✅', 'Sign up successful!', {
          userId: data.user?.id,
          emailConfirmed: data.user?.email_confirmed_at,
          session: data.session ? 'Created' : 'None'
        });
      }
    } catch (err) {
      addResult('Sign Up Test', '❌', 'Unexpected error: ' + err.message, err);
    }

    // Test 5: Database Table Access (if auth works)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        addResult('Database Tables', '⚠️', 'Table access issue: ' + error.message, error);
      } else {
        addResult('Database Tables', '✅', 'Custom tables accessible');
      }
    } catch (err) {
      addResult('Database Tables', '⚠️', 'Table test error: ' + err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔍 FreelanceFlow Diagnostics</h1>
      
      <button 
        onClick={runDiagnostics}
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          marginBottom: '20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {loading ? 'Running Tests...' : 'Run Diagnostics Again'}
      </button>

      <div style={{ marginBottom: '20px' }}>
        <h2>Test Results:</h2>
        {results.map((result, index) => (
          <div 
            key={index} 
            style={{ 
              padding: '10px', 
              marginBottom: '10px', 
              backgroundColor: result.status.includes('❌') ? '#ffe6e6' : 
                             result.status.includes('⚠️') ? '#fff3cd' : '#e6ffe6',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {result.status} {result.test} ({result.time})
            </div>
            <div style={{ marginTop: '5px' }}>{result.message}</div>
            {result.details && (
              <details style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                <summary>Show Details</summary>
                <pre style={{ marginTop: '5px', fontSize: '11px' }}>
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>🛠️ Common Fixes:</h3>
        <ul>
          <li><strong>Missing env vars:</strong> Check .env.local file exists in project root</li>
          <li><strong>Database error:</strong> Run the database migration scripts in Supabase SQL Editor</li>
          <li><strong>Auth not enabled:</strong> Check Supabase Dashboard → Authentication → Settings</li>
          <li><strong>Invalid keys:</strong> Regenerate API keys in Supabase Dashboard → Settings → API</li>
        </ul>
      </div>
    </div>
  );
}