import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function LoadingSpinner({ size = 24, className = "", color = "text-blue-600" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <CircleNotch size={size} className={`animate-spin ${color}`} />
    </div>
  );
}
