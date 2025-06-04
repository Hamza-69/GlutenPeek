import React from 'react';
import { Link } from 'react-router-dom';
import { Claim } from '../types'; // Adjust path as needed
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns'; // For formatting date

interface ClaimSearchResultItemProps {
  claim: Claim; // Expecting Claim type to have productBarcode, and optional product.name, product.pictureUrl
}

const ClaimSearchResultItem: React.FC<ClaimSearchResultItemProps> = ({ claim }) => {
  // The Claim type has status: boolean (false = open, true = closed)
  // Backend GET /api/claims/search returns status as a string like "Pending", "Approved", "Rejected"
  // For now, let's stick to the boolean interpretation or prepare for string status.
  // Assuming boolean: false is "Open/Pending", true might mean "Closed/Resolved".
  // The backend schema says: status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }
  // So, claim.status is actually a string. Let's adapt.

  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let statusText = claim.status as string; // Assuming status is string like 'Pending', 'Approved', 'Rejected'

  if (typeof claim.status === 'string') {
    statusText = claim.status.charAt(0).toUpperCase() + claim.status.slice(1);
    switch (claim.status.toLowerCase()) {
      case 'approved':
        statusVariant = 'default'; // Greenish in shadcn (default primary color)
        break;
      case 'rejected':
        statusVariant = 'destructive'; // Red
        break;
      case 'pending':
      default:
        statusVariant = 'secondary'; // Grey
        break;
    }
  } else {
    // Fallback if status is boolean (as initially propsed in subtask, but schema differs)
    statusText = claim.status ? 'Closed' : 'Open';
    statusVariant = claim.status ? 'destructive' : 'secondary';
  }


  const productDisplayName = claim.product?.name
    ? `${claim.product.name} (Barcode: ${claim.productBarcode})`
    : `Barcode: ${claim.productBarcode}`;

  const productLink = `/product/${claim.productBarcode}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-md mb-1 leading-tight line-clamp-2" title={claim.explanation}>
            {claim.explanation}
          </CardTitle>
          <Badge variant={statusVariant} className="ml-2 whitespace-nowrap">
            {statusText}
          </Badge>
        </div>
        <CardDescription>
          Claimed on: {claim.createdAt ? format(new Date(claim.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          Related Product:
          <Link
            to={productLink}
            className="text-primary hover:underline ml-1 font-medium"
          >
            {productDisplayName}
          </Link>
        </div>
        {/* Display product image if available */}
        {claim.product?.pictureUrl && (
          <div className="mt-2">
            <img src={claim.product.pictureUrl} alt={claim.product.name || 'Product image'} className="w-full h-24 object-cover rounded-md border"/>
          </div>
        )}
         {/* Display claim mediaProofUrl if available */}
         {claim.mediaProofUrl && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Proof:</p>
            <img src={claim.mediaProofUrl} alt="Claim proof" className="w-full h-24 object-cover rounded-md border"/>
          </div>
        )}
      </CardContent>
      {/* Optional Footer for a direct link to a single claim page if that existed */}
      {/* <CardFooter className="p-4 pt-0">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={`/claim/${claim.id}`}>View Claim Details</Link>
        </Button>
      </CardFooter> */}
    </Card>
  );
};

export default ClaimSearchResultItem;
