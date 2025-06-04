
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Badge import will be removed if SymptomDisplayBadge is used exclusively for symptoms
// For now, keeping it if other parts of the page use the generic Badge
import { Badge } from '@/components/ui/badge';
import SymptomDisplayBadge from './ui/SymptomDisplayBadge'; // Import the new component
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Added for completeness, though not directly changed
import { Textarea } from '@/components/ui/textarea'; // Added for completeness
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Flag, PackageSearch } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Product, StatusRef, Claim } from '../types'; // Import Claim type
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import mutation hooks
import { useAuth } from '../contexts/AuthContext'; // Import useAuth for token
import ImageUpload from './ui/image-upload'; // Import ImageUpload

// Interface for props remains the same
interface ProductPageProps {
  onBack: () => void;
  onReportSymptoms: (productId: string) => void;
  onViewAllSymptoms: (productId: string) => void;
}

const ProductPage: React.FC<ProductPageProps> = ({ onBack, onReportSymptoms, onViewAllSymptoms }) => {
  const { productId: barcode } = useParams<{ productId: string }>(); // productId is the barcode
  const { token } = useAuth(); // Get auth token
  const queryClient = useQueryClient(); // For query invalidation

  const [showReportForm, setShowReportForm] = useState(false);
  const [newStatus, setNewStatus] = useState(''); // This state is for the dropdown in the modal
  const [reportDescription, setReportDescription] = useState(''); // This is the 'explanation' for the claim
  // const [imageProof, setImageProof] = useState<File | null>(null); // Replaced by mediaProofS3Url
  const [mediaProofS3Url, setMediaProofS3Url] = useState<string | null>(null);


  const fetchProductByBarcode = async (barcode: string): Promise<Product> => {
    const response = await fetch(`/api/products/${barcode}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch product details and could not parse error response' }));
      throw new Error(errorData.message || 'Failed to fetch product details');
    }
    return response.json();
  };

  const { data: product, isLoading, error } = useQuery<Product, Error>(
    ['product', barcode],
    () => fetchProductByBarcode(barcode as string),
    {
      enabled: !!barcode, // Only run query if barcode is available
    }
  );

  // Updated getStatusInfo to work with StatusRef or string
  const getStatusInfo = (status?: StatusRef | string | number) => {
    let statusLevel: number | undefined;
    let statusLabel: string = 'Unknown Status';
    let statusReasonText: string | undefined = 'No detailed reason provided.';

    if (typeof status === 'object' && status !== null && 'level' in status) { // Check if it's a StatusRef object
      statusLevel = (status as StatusRef).level;
      statusLabel = (status as StatusRef).name || statusLabel;
      statusReasonText = (status as StatusRef).description || statusReasonText;
    } else if (typeof status === 'number') { // Fallback for old numeric status, if API returns that directly
      statusLevel = status;
      // Basic label for numeric status - can be improved
      if (status >= 4) statusLabel = 'Gluten-Free';
      else if (status === 3) statusLabel = 'May Contain Gluten';
      else statusLabel = 'Contains Gluten';
    }
    // If status is a string, it might be an ID - we can't do much with it here without more info

    if (statusLevel !== undefined) {
      if (statusLevel >= 4) return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        label: statusLabel,
        color: 'bg-green-100 text-green-800 border-green-200',
        reason: statusReasonText,
      };
      if (statusLevel === 3) return {
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        label: statusLabel,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        reason: statusReasonText,
      };
      return {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        label: statusLabel,
        color: 'bg-red-100 text-red-800 border-red-200',
        reason: statusReasonText,
      };
    }
    // Default/Unknown status
    return {
      icon: <AlertTriangle className="w-5 h-5 text-gray-500" />,
      label: 'Status Unknown',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      reason: 'Status information is not available for this product.',
    };
  };

  // Local getSeverityBadgeColorClass is now removed. Centralized version will be used by SymptomDisplayBadge.

  // --- Create Claim API Function and Mutation ---
  interface CreateClaimData {
    productBarcode: string;
    explanation: string;
    mediaProofUrl?: string; // This will be undefined for now
  }

  const createClaimApi = async (data: CreateClaimData): Promise<Claim> => {
    if (!token) throw new Error("Authentication token not found.");

    const response = await fetch('/api/claims/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to submit claim and could not parse error response' }));
      throw new Error(errorData.message || 'Failed to submit claim');
    }
    return response.json();
  };

  const { mutate: createClaim, isLoading: isCreatingClaim } = useMutation(
    createClaimApi,
    {
      onSuccess: () => {
        toast({
          title: "Claim Submitted",
          description: "Your claim has been successfully submitted for review.",
        });
        if (barcode) {
          queryClient.invalidateQueries(['product', barcode]); // Refetch product data (which might include claims)
        }
        queryClient.invalidateQueries(['claims']); // Invalidate a general claims query if one exists

        // Reset modal form and close
        setShowReportForm(false);
        setNewStatus('');
        setReportDescription('');
        // setImageProof(null); // Old state
        setMediaProofS3Url(null); // Reset S3 URL state
      },
      onError: (error: Error) => {
        toast({
          title: "Error Submitting Claim",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const handleReportSubmit = () => {
    if (!reportDescription.trim()) {
      toast({ title: "Explanation Required", description: "Please provide an explanation for your report.", variant: "destructive" });
      return;
    }
    if (!barcode) {
      toast({ title: "Product Barcode Missing", description: "Cannot submit a claim without a product barcode.", variant: "destructive" });
      return;
    }

    // mediaProofUrl will be undefined for now. S3 upload is Phase 3.
    // The `newStatus` from the modal is not directly part of the Claim schema as defined,
    // but the `explanation` (reportDescription) is.
    createClaim({
      productBarcode: barcode,
      explanation: reportDescription,
      mediaProofUrl: mediaProofS3Url || undefined, // Use S3 URL if available
    });
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="flex items-center p-4 bg-card border-b border-border">
          <Button variant="ghost" onClick={onBack} className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Product Details</h1>
        </div>
        <div className="p-4 space-y-4">
          <div className="w-full h-64 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-8 bg-muted rounded w-3/4 animate-pulse mb-2"></div>
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse bg-card border-border">
              <CardContent className="p-4 space-y-2">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background min-h-screen">
        <div className="flex items-center p-4 bg-card border-b border-border">
          <Button variant="ghost" onClick={onBack} className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Product Details</h1>
        </div>
        <div className="p-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <PackageSearch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">
                {error.message === 'Product not found' ? 'Product Not Found' : 'Error Loading Product'}
              </h3>
              <p className="text-muted-foreground">
                {error.message === 'Product not found'
                  ? `We couldn't find a product with barcode: ${barcode}.`
                  : "We encountered an issue while trying to load the product details. Please try again later."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    // This case should ideally be covered by isLoading or error states
    // but as a fallback if barcode is null/undefined initially.
    return (
        <div className="bg-background min-h-screen">
          <div className="flex items-center p-4 bg-card border-b border-border">
            <Button variant="ghost" onClick={onBack} className="mr-3">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">Product Details</h1>
          </div>
          <div className="p-4 text-center">
            <p className="text-muted-foreground">No product barcode provided or product not found.</p>
          </div>
        </div>
    );
  }

  const statusInfo = getStatusInfo(product.status); // product.status could be StatusRef or string

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center p-4 bg-card border-b border-border">
        <Button variant="ghost" onClick={onBack} className="mr-3">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Product Details</h1>
      </div>

      <div className="pb-20">
        {/* Product Image */}
        <div className="w-full h-64 bg-muted flex items-center justify-center">
          {product.pictureUrl ? (
            <img src={product.pictureUrl} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-6xl">📦</span>
          )}
        </div>

        <div className="p-4">
          <h2 className="text-2xl font-bold text-foreground mb-2">{product.name}</h2>
        </div>

        {/* Description Section */}
        {product.description && (
          <Card className="mx-4 mb-4 bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.description}
              </p>
            </CardContent>
          </Card>
        )}

        {product.ingredients && product.ingredients.length > 0 && (
          <Card className="mx-4 mb-4 bg-card border-border">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3">Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ingredient, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-accent text-foreground"
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Section - Uses updated getStatusInfo */}
        <Card className="mx-4 mb-4 bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Status</h3>
            <div className="flex items-center space-x-3 mb-2">
              {statusInfo.icon}
              <Badge className={`${statusInfo.color} border`}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {statusInfo.reason}
            </p>
          </CardContent>
        </Card>

        {/* Community Symptoms - Placeholder/Simplified for now */}
        {/* This section will need more specific data from the API (product.symptoms) */}
        {/* For now, let's assume product.symptoms might be an array of SymptomRef or strings */}
        <Card className="mx-4 mb-4 bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Symptoms Reported by Others</h3>
            {product.symptoms && Array.isArray(product.symptoms) && product.symptoms.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {product.symptoms.map((symptomData: any, index: number) => {
                    // Adapt to the expected structure of product.symptoms.
                    // If it's just SymptomRef[], then count and severity will be undefined.
                    // If it's the richer structure { name, count, averageSeverity, maxSeverity }, it will be used.
                    const name = typeof symptomData === 'string' ? symptomData : symptomData.name;
                    const count = typeof symptomData === 'object' && symptomData.count ? symptomData.count : undefined;
                    const severity = typeof symptomData === 'object' ? (symptomData.averageSeverity ?? symptomData.maxSeverity) : undefined;

                    // Fallback key for safety, prefer id or name if available
                    const key = (typeof symptomData === 'object' && symptomData.id) ? symptomData.id : name + index;

                    return (
                      <SymptomDisplayBadge
                        key={key}
                        name={name}
                        count={count}
                        severity={severity}
                      />
                    );
                  })}
                </div>
                {/* The View All button might need to be re-evaluated if the number of unique symptoms is small */}
                {/* For now, keeping it based on total entries if that's how product.symptoms is structured */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gradient-gold-bg text-black border-0"
                  onClick={() => onViewAllSymptoms(product.id)}
                >
                  View All ({product.symptoms.length})
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No symptoms reported by the community yet.</p>
            )}
          </CardContent>
        </Card>

        {/* User Symptoms - This would require user-specific data, not typically part of product details */}
        {/* Commenting out for now as it's unlikely to be populated by /api/products/:barcode */}
        {/*
        <Card className="mx-4 mb-4 bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Symptoms Reported by You</h3>
            <p className="text-sm text-muted-foreground">Symptom reporting feature coming soon.</p>
          </CardContent>
        </Card>
        */}

        {/* Report Symptoms Button */}
        <div className="px-4 mb-4">
          <Button 
            onClick={() => onReportSymptoms(product.id)}
            className="w-full gradient-bg text-white py-3"
          >
            Report Symptoms for This Product
          </Button>
        </div>

        <div className="px-4">
          <Button 
            onClick={() => setShowReportForm(true)}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            <Flag className="w-4 h-4 mr-2" />
            Report Incorrect Labeling
          </Button>
        </div>
      </div>

      {/* Report Form Modal - Unchanged for now, uses local state */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Report Incorrect Labeling</h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Correct Status
                  </Label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select correct status</option>
                    <option value="1">Contains Gluten</option>
                    <option value="2">Likely Contains Gluten</option>
                    <option value="3">May Contain Gluten</option>
                    <option value="4">Likely Gluten-Free</option>
                    <option value="5">Gluten-Free</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Upload Evidence (Optional)
                  </Label>
                  <ImageUpload
                    images={mediaProofS3Url ? [mediaProofS3Url] : []}
                    onImagesChange={(urls) => setMediaProofS3Url(urls[0] || null)}
                    maxImages={1}
                    pathPrefix="claims/"
                    buttonText="Upload Proof Image"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Explanation <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Please explain why you think the labeling is incorrect..."
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground min-h-[80px]"
                    required
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={handleReportSubmit}
                    className="flex-1 gradient-bg text-white"
                    disabled={isCreatingClaim || !reportDescription.trim()}
                  >
                    {isCreatingClaim ? 'Submitting...' : 'Submit Report'}
                  </Button>
                  <Button 
                    onClick={() => {
                      if (isCreatingClaim) return; // Prevent closing if submitting
                      setShowReportForm(false);
                      setNewStatus('');
                      setReportDescription('');
                      // setImageProof(null); // Old state
                      setMediaProofS3Url(null); // Reset S3 URL state
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
