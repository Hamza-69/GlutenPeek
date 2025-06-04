import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Centralized function to get Tailwind CSS classes for symptom badges based on severity
export const getSeverityBadgeColorClass = (severity?: number): string => {
  if (severity === undefined || severity === null || severity === 0) return 'bg-gray-200 text-gray-800 hover:bg-gray-300'; // Default/None
  if (severity === 1) return 'bg-green-100 text-green-800 hover:bg-green-200';    // Mild
  if (severity === 2) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'; // Moderate
  if (severity === 3) return 'bg-orange-100 text-orange-800 hover:bg-orange-200'; // Significant
  if (severity === 4) return 'bg-red-100 text-red-800 hover:bg-red-200';          // Severe
  if (severity >= 5) return 'bg-rose-100 text-rose-800 hover:bg-rose-200';      // Very Severe / Max
  return 'bg-gray-200 text-gray-800 hover:bg-gray-300'; // Fallback for any other unexpected values
};
