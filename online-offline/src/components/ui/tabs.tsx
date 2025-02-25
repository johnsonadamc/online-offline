"use client";
import React from 'react';

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

interface TabState {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

export const Tabs = ({ defaultValue, className = '', children }: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const contextValue = {
    activeTab,
    setActiveTab
  };

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, contextValue);
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

export const TabsList = ({ className = '', children, activeTab, setActiveTab }: TabsListProps) => {
  return (
    <div className={`flex border-b ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { activeTab, setActiveTab });
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger = ({ value, activeTab, setActiveTab, className = '', children }: TabsTriggerProps) => {
  return (
    <button
      className={`px-4 py-2 ${activeTab === value ? 'border-b-2 border-blue-500 text-blue-500' : ''} ${className}`}
      onClick={() => setActiveTab?.(value)}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  activeTab?: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent = ({ value, activeTab, className = '', children }: TabsContentProps) => {
  if (activeTab !== value) return null;
  return (
    <div className={className}>
      {children}
    </div>
  );
};