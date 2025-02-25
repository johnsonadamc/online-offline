import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = ({ className = '', ...props }: InputProps) => {
  return (
    <input
      className={`w-full px-3 py-2 border rounded-md ${className}`}
      {...props}
    />
  );
};
