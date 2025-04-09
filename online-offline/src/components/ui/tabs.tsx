"use client";
import React from 'react';

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

// Define the props that will be passed to child components
interface TabContextProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

export const Tabs = ({ defaultValue, className = '', children }: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const contextValue: TabContextProps = {
    activeTab,
    setActiveTab
  };

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Use type assertion to specify that props can include our context values
          return React.cloneElement(child, contextValue as Partial<typeof child.props>);
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps extends Partial<TabContextProps> {
  className?: string;
  children: React.ReactNode;
}

export const TabsList = ({ className = '', children, activeTab, setActiveTab }: TabsListProps) => {
  return (
    <div className={`flex border-b ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Use type assertion to let TypeScript know these props are compatible
          return React.cloneElement(child, { 
            activeTab, 
            setActiveTab 
          } as Partial<typeof child.props>);
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps extends Partial<TabContextProps> {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger = ({ value, activeTab, setActiveTab, className = '', children }: TabsTriggerProps) => {
  const handleClick = React.useCallback(() => {
    if (setActiveTab) {
      setActiveTab(value);
    }
  }, [value, setActiveTab]);

  return (
    <button
      className={`px-4 py-2 ${activeTab === value ? 'border-b-2 border-blue-500 text-blue-500' : ''} ${className}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

interface TabsContentProps extends Partial<TabContextProps> {
  value: string;
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