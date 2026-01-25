import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatAmount(amount) {
    if (!amount) return '0.00 EUR';
    const numStr = amount.toString().replace(' EUR', '').replace(',', '.');
    const num = parseFloat(numStr);
    if (isNaN(num)) return amount;
    return `${num.toFixed(2)} EUR`;
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('hr-HR');
    } catch {
        return dateStr;
    }
}

export function getStatusLabel(status) {
    const labels = {
        pending: 'Čeka',
        found: 'Pronađen',
        downloaded: 'Preuzet',
        manual: 'Ručno',
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
