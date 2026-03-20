/**
 * Centralized Date Utilities for CompeteHub
 */

/**
 * Formats a date to IST string (e.g., "15 March, 2026")
 * @param {Date | string | number} date 
 * @returns {string}
 */
export const formatDateIST = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Formats a date to a relative time string (e.g., "in 2 hours")
 * Useful for the Schedule page
 */
export const formatRelativeTime = (timestamp) => {
  const now = new Date().getTime();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  if (absDiff < 60000) return 'just now';
  
  const minutes = Math.floor(absDiff / 60000);
  if (minutes < 60) return diff > 0 ? `in ${minutes}m` : `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return diff > 0 ? `in ${hours}h` : `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return diff > 0 ? `in ${days}d` : `${days}d ago`;
};
