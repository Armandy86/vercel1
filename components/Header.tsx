'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/clients', label: 'Clients' },
  { href: '/plans', label: 'Plans' },
  { href: '/payments', label: 'Payments' },
  { href: '/services', label: 'Services' },
  { href: '/reports', label: 'Reports' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ height: 32, background: '#4A1414', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', color: 'rgba(255,255,255,0.85)', fontSize: 12, letterSpacing: '0.05em' }}>
        System Administration
      </div>

      <div style={{ height: 56, background: '#5C1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none' }}>
          <span className="font-serif" style={{ fontSize: 20, color: '#fff', fontWeight: 600 }}>FunePlan</span>
          <span className="hidden sm:inline" style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Life Plan System</span>
        </Link>

        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 4 }}>
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                  borderRadius: 4,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </Link>
            );
          })}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.04em',
              borderRadius: 4,
              color: 'rgba(255,255,255,0.7)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden"
          style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden" style={{ background: '#5C1A1A', padding: '8px 0' }}>
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: '10px 32px',
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'uppercase' as const,
                color: pathname === href ? '#fff' : 'rgba(255,255,255,0.7)',
                background: pathname === href ? 'rgba(255,255,255,0.1)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            style={{
              display: 'block', width: '100%', padding: '10px 32px', fontSize: 14, fontWeight: 500,
              textTransform: 'uppercase' as const, textAlign: 'left', color: 'rgba(255,255,255,0.7)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
