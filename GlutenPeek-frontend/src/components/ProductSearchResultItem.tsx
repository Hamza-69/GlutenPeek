import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types'; // Adjust path as needed
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackageSearch } from 'lucide-react'; // Fallback icon

interface ProductSearchResultItemProps {
  product: Product;
}

const ProductSearchResultItem: React.FC<ProductSearchResultItemProps> = ({ product }) => {
  return (
    <Card className="overflow-hidden flex flex-col h-full"> {/* Added flex flex-col h-full for consistent card height */}
      <CardHeader className="p-0 relative aspect-square"> {/* Made aspect-square for image consistency */}
        {product.pictureUrl ? (
          <img
            src={product.pictureUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <PackageSearch className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow"> {/* Added flex-grow to push footer down */}
        <CardTitle className="text-lg mb-1 leading-tight hover:text-primary transition-colors">
          <Link to={`/product/${product.barcode}`} title={product.name} className="block truncate">
            {product.name}
          </Link>
        </CardTitle>
        {/* Optionally, show a snippet of ingredients or other info */}
        {product.ingredients && product.ingredients.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-2" title={product.ingredients.join(', ')}>
            Ingredients: {product.ingredients.slice(0,5).join(', ')}{product.ingredients.length > 5 ? '...' : ''}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0"> {/* Removed pt-0 if CardContent has enough padding */}
        <Button asChild variant="outline" className="w-full">
          <Link to={`/product/${product.barcode}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductSearchResultItem;
