import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { User } from '../types'; // Assuming User type is appropriate for search results
import UserSearchResultItem from '../components/UserSearchResultItem'; // Import the new component

interface ApiUserSearchResponse {
  users: User[];
  nextCursor?: string | null;
}

const fetchSearchedUsers = async ({ pageParam = undefined, queryKey }: any): Promise<ApiUserSearchResponse> => {
  const [_key, searchQuery] = queryKey;
  const limit = 15; // Adjust as needed
  let url = `/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
  if (pageParam) {
    url += `&cursor=${pageParam}`;
  }
  const response = await fetch(url); // Public endpoint
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Error fetching user search results" }));
    throw new Error(errorData.message || 'Network response was not ok for user search');
  }
  return response.json();
};

const UserSearchPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || '';
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery<ApiUserSearchResponse, Error>(
    ['searchedUsers', searchQuery],
    fetchSearchedUsers,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      enabled: !!searchQuery, // Only run if query exists
    }
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allUsers = data?.pages.flatMap(page => page.users) || [];

  return (
    <div className="container mx-auto p-4"> {/* Removed max-w-2xl to allow wider grid */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold truncate">
          User Search {searchQuery ? <span className="text-muted-foreground font-normal">for "{searchQuery}"</span> : ''}
        </h1>
      </div>

      {/* Future: Add a search input here specific to this page for refining search */}

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading users...</p>
        </div>
      )}
      {isError && <p className="text-destructive text-center py-10">Error: {error?.message || "Failed to load users."}</p>}

      {!isLoading && !isError && allUsers.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">
            No users found {searchQuery ? `for "${searchQuery}"` : ''}.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try a different name or keyword.
          </p>
        </div>
      )}

      {allUsers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allUsers.map(user => (
            <UserSearchResultItem key={user.id} user={user} />
          ))}
        </div>
      )}

      <div ref={ref} className="h-10 mt-4 flex justify-center items-center">
        {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!hasNextPage && !isLoading && !isFetchingNextPage && allUsers.length > 0 && (
          <p className="text-sm text-muted-foreground">No more results.</p>
        )}
      </div>
    </div>
  );
};

export default UserSearchPage;
