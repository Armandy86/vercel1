'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f5f5' }}>
      <div className="flex items-center justify-end px-8" style={{ height: 32, background: '#4A1414', color: 'rgba(255,255,255,0.85)', fontSize: 12, letterSpacing: '0.05em' }}>
        System Administration
      </div>

      <div className="flex items-center justify-center px-8" style={{ height: 64, background: '#5C1A1A' }}>
        <span className="font-serif" style={{ fontSize: 22, color: '#fff', fontWeight: 600 }}>FunePlan</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: 10 }}>Life Plan System</span>
      </div>

      <div className="text-center" style={{ padding: '40px 24px', background: '#4B4B4B' }}>
        <h1 className="font-serif" style={{ fontSize: 30, color: '#fff', fontWeight: 400 }}>Administrator Sign In</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Funeral Life Plan Payment and Service Monitoring</p>
      </div>

      <div className="flex-1 flex justify-center" style={{ padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="fp-card" style={{ padding: 28 }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    className="fp-input"
                    type="email"
                    placeholder="admin@funeplan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    className="fp-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingLeft: 36, paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 18 }}>
                  <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
                </div>
              )}

              <button className="fp-btn fp-btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '11px 16px', fontSize: 15 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 28 }}>
            "Your sympathy is our success."
          </p>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            FunePlan {new Date().getFullYear()} - System Administration
          </p>
        </div>
      </div>
    </div>
  );
}
