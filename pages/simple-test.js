import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SimpleTest() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check current user
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    getUser();
  }, []);

  const simpleSignUp = async () => {
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    
    if (!email || !password) return;

    // Just create auth user, don't worry about profile for now
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Success! Check your email for verification.');
    }
  };

  const simpleSignIn = async () => {
    const email = prompt('Enter email:');
    const password = prompt('Enter password:');
    
    if (!email || !password) return;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setUser(data.user);
      alert('Signed in successfully!');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    alert('Signed out!');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>🧪 Simple Auth Test</h1>
      
      {user ? (
        <div>
          <h2>✅ Signed in as: {user.email}</h2>
          <p>User ID: {user.id}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <h2>🔐 Not signed in</h2>
          <button onClick={simpleSignUp} style={{ margin: '5px' }}>Simple Sign Up</button>
          <button onClick={simpleSignIn} style={{ margin: '5px' }}>Simple Sign In</button>
        </div>
      )}
    </div>
  );
}