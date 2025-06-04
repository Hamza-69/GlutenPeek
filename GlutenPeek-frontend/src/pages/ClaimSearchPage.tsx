import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Claim } from '../types'; // Assuming Claim type is appropriate for search results
import ClaimSearchResultItem from '../components/ClaimSearchResultItem'; // Import the new component

interface ApiClaimSearchResponse {
  claims: Claim[];
  nextCursor?: string | null;
}

const fetchSearchedClaims = async ({ pageParam = undefined, queryKey }: any): Promise<ApiClaimSearchResponse> => {
  const [_key, searchQuery] = queryKey;
  const limit = 10;
  let url = `/api/claims/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
  if (pageParam) {
    url += `&cursor=${pageParam}`;
  }
  const response = await fetch(url); // Public endpoint
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Error fetching claim search results" }));
    throw new Error(errorData.message || 'Network response was not ok for claim search');
  }
  return response.json();
};

const ClaimSearchPage: React.FC = () => {
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
  } = useInfiniteQuery<ApiClaimSearchResponse, Error>(
    ['searchedClaims', searchQuery],
    fetchSearchedClaims,
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

  const allClaims = data?.pages.flatMap(page => page.claims) || [];

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold truncate">
          Claim Search {searchQuery ? <span className="text-muted-foreground font-normal">for "{searchQuery}"</span> : ''}
        </h1>
      </div>

      {/* Future: Add a search input here specific to this page for refining search */}

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading claims...</p>
        </div>
      )}
      {isError && <p className="text-destructive text-center py-10">Error: {error?.message || "Failed to load claims."}</p>}

      {!isLoading && !isError && allClaims.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">
            No claims found {searchQuery ? `for "${searchQuery}"` : ''}.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try searching for different keywords or product names.
          </p>
        </div>
      )}

      {allClaims.length > 0 && (
         <div className="space-y-4"> {/* Claims are typically listed, not gridded like products/users */}
          {allClaims.map(claim => (
            <ClaimSearchResultItem key={claim.id} claim={claim} />
          ))}
        </div>
      )}

      <div ref={ref} className="h-10 mt-4 flex justify-center items-center">
        {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!hasNextPage && !isLoading && !isFetchingNextPage && allClaims.length > 0 && (
          <p className="text-sm text-muted-foreground">No more results.</p>
        )}
      </div>
    </div>
  );
};

export default ClaimSearchPage;
