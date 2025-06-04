
import React from 'react';
import { cn } from '@/lib/utils';
import { User, User as UserIcon, Camera, Settings, Bot } from 'lucide-react';

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'welcome', icon: UserIcon, label: 'Profile' },
    { id: 'community', icon: User, label: 'Community' },
    { id: 'scan', icon: Camera, label: 'Scan', isCenter: true },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'chatbot', icon: Bot, label: 'AI' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-all duration-200",
                activeTab === item.id && "text-primary",
                activeTab !== item.id && "text-muted-foreground"
              )}
            >
              <IconComponent className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
