'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin'); // Redirect to dashboard on success
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="h2 mb-4">Admin Login</h1>
          <p className="text-secondary">Sign in to manage the Creative Store.</p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '16px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
