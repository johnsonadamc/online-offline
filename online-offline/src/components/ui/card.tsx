import React from 'react';

interface CardProps {
  className?: string;
  children?: React.ReactNode;
}

const Card = ({ className = '', children }: CardProps) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ className = '', children }: CardProps) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

const CardTitle = ({ className = '', children }: CardProps) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ className = '', children }: CardProps) => {
  return (
    <div className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardContent };
