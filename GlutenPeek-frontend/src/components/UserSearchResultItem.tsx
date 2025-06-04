import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types'; // Adjust path as needed
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface UserSearchResultItemProps {
  user: User; // Expecting User type to have at least id, name, pfp
}

const UserSearchResultItem: React.FC<UserSearchResultItemProps> = ({ user }) => {
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <Card className="flex flex-col items-center p-4 text-center h-full"> {/* Ensure card takes full height of grid cell */}
      <Avatar className="w-20 h-20 mb-3">
        <AvatarImage src={user.pfp || undefined} alt={user.name} /> {/* Handle potentially missing pfp */}
        <AvatarFallback className="gradient-bg text-white text-2xl"> {/* Larger fallback text */}
          {userInitial}
        </AvatarFallback>
      </Avatar>
      <CardContent className="p-0 mb-3 flex-grow"> {/* flex-grow to push footer down */}
        <h3 className="font-semibold truncate text-lg" title={user.name}>
          {user.name || 'Unnamed User'}
        </h3>
        {/* Display bio if available and not too long, or add a specific field for tagline */}
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2" title={user.bio}>
            {user.bio}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-0">
        <Button asChild variant="outline" size="sm" className="w-full">
          {/* Link to a future user profile page */}
          <Link to={`/profile/${user.id}`}>View Profile</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserSearchResultItem;
