import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Product } from '../types';
import ProductSearchResultItem from '../components/ProductSearchResultItem'; // Import the new component

interface ApiProductSearchResponse {
  products: Product[];
  nextCursor?: string | null;
}

const fetchSearchedProducts = async ({ pageParam = undefined, queryKey }: any): Promise<ApiProductSearchResponse> => {
  const [_key, searchQuery] = queryKey; // Token removed as API is public
  const limit = 12;
  let url = `/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
  if (pageParam) {
    url += `&cursor=${pageParam}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Error fetching product search results" }));
    throw new Error(errorData.message || 'Network response was not ok for product search');
  }
  return response.json();
};

const ProductSearchPage: React.FC = () => {
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
  } = useInfiniteQuery<ApiProductSearchResponse, Error>(
    ['searchedProducts', searchQuery],
    fetchSearchedProducts,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      enabled: !!searchQuery,
    }
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allProducts = data?.pages.flatMap(page => page.products) || [];

  return (
    <div className="container mx-auto p-4"> {/* Removed max-w-3xl for full width, grid will handle item size */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/"> {/* Changed back button to link to home */}
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold truncate">
          Product Search {searchQuery ? <span className="text-muted-foreground font-normal">for "{searchQuery}"</span> : ''}
        </h1>
      </div>

      {/* Future: Add a search input here specific to this page for refining search */}

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading products...</p>
        </div>
      )}
      {isError && <p className="text-destructive text-center py-10">Error: {error?.message || "Failed to load products."}</p>}

      {!isLoading && !isError && allProducts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">
            No products found {searchQuery ? `for "${searchQuery}"` : ''}.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try a different search term.
          </p>
        </div>
      )}

      {allProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allProducts.map(product => (
            <ProductSearchResultItem key={product.id || product.barcode} product={product} />
          ))}
        </div>
      )}

      <div ref={ref} className="h-10 mt-4 flex justify-center items-center">
        {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!hasNextPage && !isLoading && !isFetchingNextPage && allProducts.length > 0 && (
          <p className="text-sm text-muted-foreground">No more results.</p>
        )}
      </div>
    </div>
  );
};

export default ProductSearchPage;
