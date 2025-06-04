
import React from 'react';
import { cn } from '@/lib/utils';
import { User, User as UserIcon, Camera, Settings, Bot } from 'lucide-react';

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'welcome', icon: UserIcon, label: 'Profile' },
    { id: 'community', icon: User, label: 'Community' },
    { id: 'scan', icon: Camera, label: 'Scan' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'chatbot', icon: Bot, label: 'AI' },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-20 bg-card border-r border-border flex flex-col items-center py-6 space-y-6 z-30">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center p-3 rounded-lg transition-all duration-200 hover:bg-accent",
              activeTab === item.id && "bg-primary/10 text-primary",
              activeTab !== item.id && "text-muted-foreground"
            )}
            title={item.label}
          >
            <IconComponent className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};

export default DesktopSidebar;
