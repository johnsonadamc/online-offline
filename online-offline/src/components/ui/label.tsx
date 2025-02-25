import React from 'react';

interface LabelProps {
  className?: string;
  children?: React.ReactNode;
  htmlFor?: string;
}

export const Label = ({ className = '', children, htmlFor }: LabelProps) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 ${className}`}
    >
      {children}
    </label>
  );
};
