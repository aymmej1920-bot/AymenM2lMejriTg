export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if invalid date
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // Fallback to original string on error
  }
};

export const getDaysUntilExpiration = (expirationDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  const timeDiff = expiry.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

export const getDaysSinceEntry = (dateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDate = new Date(dateString);
  entryDate.setHours(0, 0, 0, 0);
  const timeDiff = today.getTime() - entryDate.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};