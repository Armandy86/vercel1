import { Header } from '@/components/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <footer style={{ padding: '20px 0', textAlign: 'center', background: '#4A1414' }}>
        <p className="font-serif" style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>FunePlan</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          "Your sympathy is our success." - {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
