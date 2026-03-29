interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export function StatsCard({ title, value, subtitle }: StatsCardProps) {
  return (
    <div className="fp-stat">
      <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 6 }}>{value}</p>
      {subtitle && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}
