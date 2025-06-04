import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getSeverityBadgeColorClass } from '@/lib/utils'; // Adjusted path assuming src/lib/utils.ts

interface SymptomDisplayBadgeProps {
  name: string;
  count?: number;
  severity?: number; // Represents the severity level (e.g., 1-5) used for coloring
  className?: string; // Allow for additional custom classes
}

const SymptomDisplayBadge: React.FC<SymptomDisplayBadgeProps> = ({
  name,
  count,
  severity,
  className = '',
}) => {
  let displayText = name;
  if (count && count > 1) {
    displayText += ` x${count}`;
  }

  const colorClass = getSeverityBadgeColorClass(severity);

  // whitespace-nowrap is added to prevent text wrapping within the badge
  // Default classes are applied first, then specific color, then any custom className for overrides
  const badgeClasses = `rounded-full px-3 py-1 text-xs whitespace-nowrap ${colorClass} ${className}`;

  return (
    <Badge className={badgeClasses}>
      {displayText}
    </Badge>
  );
};

export default SymptomDisplayBadge;
