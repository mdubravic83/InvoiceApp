import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount) {
  if (amount === null || amount === undefined) return '0,00 EUR';
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' EUR';
}

export function getStatusLabel(status) {
  const labels = {
    pending: 'Ceka',
    found: 'Pronadjen',
    downloaded: 'Preuzet',
    manual: 'Rucno',
  };
  return labels[status] || status;
}

export function getStatusClass(status) {
  const classes = {
    pending: 'status-pending',
    found: 'status-found',
    downloaded: 'status-downloaded',
    manual: 'status-manual',
  };
  return classes[status] || 'status-pending';
}
