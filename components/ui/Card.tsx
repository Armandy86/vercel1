interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className, onClick, hover, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`fp-card ${className ?? ''}`}
      style={{ cursor: hover ? 'pointer' : undefined, transition: hover ? 'box-shadow 0.2s, transform 0.2s' : undefined, ...style }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', ...style }}>{children}</div>
  );
}

export function CardBody({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ padding: '14px 20px', ...style }}>{children}</div>
  );
}

export function CardFooter({ children, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', ...style }}>{children}</div>
  );
}
