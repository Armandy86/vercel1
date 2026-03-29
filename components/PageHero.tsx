interface PageHeroProps {
  title: string;
  subtitle?: string;
}

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <div style={{
      padding: '50px 24px',
      textAlign: 'center',
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(/hero-bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <h1 className="font-serif" style={{ fontSize: 28, color: '#fff', fontWeight: 400, margin: 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>{subtitle}</p>
      )}
    </div>
  );
}
