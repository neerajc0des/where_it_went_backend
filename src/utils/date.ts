// Converts a JavaScript Date object into a standardized local date string (YYYY-MM-DD).
// new Date(2026, 4, 28) -> "2026-05-28"

export const formatToLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};