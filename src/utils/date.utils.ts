export const formatDate = (dateString: string | Date): string => {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (dateString: string | Date): string => {
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDateTime = (dateString: string | Date): string => {
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
};
