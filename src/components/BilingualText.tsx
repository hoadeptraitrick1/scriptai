import React from 'react';

export const BilingualText = ({ text, className = '', secondaryClassName = 'text-theme-muted', prefix }: { text: string, className?: string, secondaryClassName?: string, prefix?: React.ReactNode }) => {
  if (!text) return null;
  const parts = text.split(' | ');
  if (parts.length < 2) {
    const slashParts = text.split(' / ');
    if (slashParts.length === 2) {
      return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
          <span>{prefix}{slashParts[0]}</span>
          <span className={`italic text-[0.95em] ${secondaryClassName}`}>{slashParts[1]}</span>
        </div>
      );
    }
    return <span className={className}>{prefix}{text}</span>;
  }
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span>{prefix}{parts[0]}</span>
      <span className={`italic text-[0.95em] ${secondaryClassName}`}>{parts.slice(1).join(' | ')}</span>
    </div>
  );
};
