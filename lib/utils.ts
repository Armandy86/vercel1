export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return 'PHP ' + formatted;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateFull(dateString: string): string {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    deceased: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    cash: 'bg-green-100 text-green-700',
    gcash: 'bg-blue-100 text-blue-700',
    bank_transfer: 'bg-purple-100 text-purple-700',
    check: 'bg-orange-100 text-orange-700',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-600';
}

export function getPlanTypeColor(planType: string): string {
  const colors: Record<string, string> = {
    bronze: 'bg-amber-100 text-amber-700 border-amber-200',
    silver: 'bg-gray-100 text-gray-600 border-gray-200',
    gold: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    platinum: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return colors[planType] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}
