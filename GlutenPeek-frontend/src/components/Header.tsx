
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Header: React.FC = () => {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate
  const [searchType, setSearchType] = useState('people'); // Default search type
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchOptions = [{
    value: 'people',
    label: 'People'
  }, {
    value: 'posts',
    label: 'Posts'
  }, {
    value: 'products',
    label: 'Products'
  }, {
    value: 'claims',
    label: 'Claims'
  }];

  const handleSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault(); // Prevent default if called from a form
    // If query is empty, specific action might depend on UX design (e.g., do nothing, or go to general page)
    // For now, we'll allow navigation with empty query to potentially show all or a default state on target page.

    if (searchType === 'posts') {
      // Navigate to CommunityTab with query parameter
      if (searchQuery.trim()) {
        navigate(`/community?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate('/community'); // Navigate to base community page if query is empty
      }
    } else if (searchType === 'products') {
      navigate(`/products/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (searchType === 'people') { // 'people' is the value in searchOptions for user search
      navigate(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (searchType === 'claims') {
      navigate(`/claims/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      // Handle other search types or show a message
      console.log(`Search submitted for type "${searchType}" with query "${searchQuery}"`);
    }
    setShowDropdown(false); // Hide dropdown after search
  };

  return <header className="sticky top-0 z-40 bg-card shadow-sm border-b border-border px-2 sm:px-4 py-3 flex items-center justify-between backdrop-blur-sm">
      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
        {/* Update to use pfp and handle loading state for avatar */}
        <AvatarImage src={!isAuthLoading && authUser ? authUser.pfp : undefined} />
        <AvatarFallback className="gradient-bg text-white text-sm sm:text-base">
          {isAuthLoading ? '...' : authUser?.name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Wrap input in a form for Enter key submission */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-2 sm:mx-4 relative min-w-0">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
          <Input
            placeholder={`Search ${searchType}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            // Consider onBlur carefully if it interferes with dropdown clicks
            // onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="pl-8 sm:pl-10 pr-16 sm:pr-20 bg-background border border-border rounded-full text-sm sm:text-base"
          />
          
          {/* Search type selector */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            
          </div>
        </div>

        {/* Dropdown menu */}
        {showDropdown && <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {/* Search type options */}
            <div className="p-2">
              <div className="flex flex-col gap-1">
                {searchOptions.map(option => <button key={option.value} onClick={() => {
              setSearchType(option.value);
              setShowDropdown(false);
            }} className={`px-2 sm:px-3 py-2 text-xs sm:text-sm rounded transition-colors text-left ${searchType === option.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                    {option.label}
                  </button>)}
              </div>
            </div>
          </div>}
      </form>

      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="text-lg sm:text-2xl">🔥</div>
        <Badge variant="secondary" className="text-xs px-1 sm:px-2 py-1 gradient-gold-bg text-black">
          {isAuthLoading ? '...' : authUser?.streak || 0}
        </Badge>
      </div>
    </header>;
};

export default Header;
