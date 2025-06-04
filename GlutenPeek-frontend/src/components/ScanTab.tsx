
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Clock, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Scan as ScanType } from '../types'; // Renamed to avoid conflict with component name
import { barcodeApi, scanApi, productApi, openFoodFactsApi, statusApi, geminiApi } from '@/lib/api';
import { uploadFileToS3 } from '@/lib/s3upload';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Using real S3 upload instead of placeholder
const uploadImageToServer = async (file: File, pathPrefix: string = "products/"): Promise<string> => {
  const uploadResult = await uploadFileToS3(file, pathPrefix);
  
  if (uploadResult.error) {
    throw new Error(uploadResult.error);
  }
  
  return uploadResult.data?.fileUrl || '';
};

const ScanTab: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [isScanning, setIsScanning] = useState(false); // Will be used for both fake scanning and API loading
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [showUploadModal, setShowUploadModal] = useState(false); // For "product not found" flow
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [currentBarcodeForUpload, setCurrentBarcodeForUpload] = useState<string | null>(null);


  // --- Create Scan API Function and Mutation ---
  interface CreateScanData {
    productBarcode: string;
    date: string; // ISO string
    symptoms?: string[]; // Optional
  }

  const createScanApi = async (scanData: CreateScanData): Promise<ScanType> => {
    if (!token) throw new Error("Authentication token not found.");

    const response = await scanApi.recordScan(scanData, token);

    if (response.error) {
      const barcode = scanData.productBarcode;
      
      if (response.status === 404) {
        const productNotFoundError: any = new Error(response.error);
        productNotFoundError.isProductNotFound = true;
        productNotFoundError.barcode = barcode;
        throw productNotFoundError;
      }
      
      // For other errors, include barcode if possible, for context
      const genericError: any = new Error(response.error);
      genericError.barcode = barcode;
      throw genericError;
    }
    
    return response.data;
  };

  const scanBarcodeFromImage = async (imageBlob: Blob): Promise<string | null> => {
    try {
      const response = await barcodeApi.scanBarcodeFromImage(imageBlob);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data?.barcode) {
        return response.data.barcode;
      } else {
        throw new Error('No barcode detected in the image');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      // Re-throw to be caught by handleCameraScan
      throw error;
    }
  };

const fetchProductFromOpenFoodFacts = async (barcode: string, authToken: string | null): Promise<{ success: boolean; reason?: string; message?: string; productData?: any; }> => {
  try {
    // Use our API service to fetch from Open Food Facts
    const offResponse = await openFoodFactsApi.getProduct(barcode);

    if (offResponse.error) {
      if (offResponse.status === 404) {
        return { success: false, reason: 'OFF_NOT_FOUND' };
      }
      // For other HTTP errors from OFF, treat as OFF_NOT_FOUND or a generic error
      console.warn(`Open Food Facts API error for barcode ${barcode}: ${offResponse.status} ${offResponse.error}`);
      return { success: false, reason: 'OFF_API_ERROR', message: offResponse.error };
    }

    const offData = offResponse.data;
    if (offData.status === 0 || !offData.product) {
      return { success: false, reason: 'OFF_NOT_FOUND' };
    }

    const product = offData.product;
    const productPayload = {
      barcode: barcode,
      name: product.product_name || product.product_name_en || product.name || 'Unknown Product',
      ingredients: product.ingredients_text_with_allergens || product.ingredients_text || product.ingredients_text_en || product.ingredients_text_debug || '',
      pictureUrl: product.image_front_url || product.image_url || product.image_small_url || '',
    };

    if (!authToken) {
        return { success: false, reason: 'AUTH_ERROR', message: "Authentication token not found for saving product." };
    }

    // Use our API service to create the product
    const backendResponse = await productApi.createProduct(productPayload, authToken);

    if (backendResponse.error) {
      return { success: false, reason: 'DB_SAVE_FAILED', message: `Failed to save product to our DB: ${backendResponse.error}` };
    }

    return { success: true, productData: backendResponse.data };

  } catch (error) {
    console.error("Error in fetchProductFromOpenFoodFacts:", error);
    return { success: false, reason: 'ERROR', message: (error as Error).message };
  }
};

// Define ProductInScan based on assumptions for clarity in checkAndProcessGlutenStatus
interface ProductInScan {
  barcode: string;
  name: string;
  ingredients: string;
  createdAt: string; // ISO date string for product creation/last update
  // Assuming 'status' object exists directly on product from backend API /api/scans/
  status: {
    status: 'gluten-free' | 'contains-gluten' | 'unknown' | string;
    explanation?: string;
  };
}


const checkAndProcessGlutenStatus = async (product: ProductInScan, authToken: string | null, globalSetIsScanning: (isScanning: boolean) => void): Promise<any | null> => {
  if (!product.createdAt || !product.status) {
    console.log("Product data incomplete for gluten status check (missing createdAt or status object).");
    return null;
  }

  const productDate = new Date(product.createdAt);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (productDate > oneWeekAgo) {
    console.log(`Product ${product.name} (barcode: ${product.barcode}) status is recent. No AI check needed.`);
    return product.status; // Return original status
  }

  console.log(`Product ${product.name} (barcode: ${product.barcode}) is older than 1 week. Checking gluten status with AI.`);
  // Use a local loading state or a more specific one if global 'isScanning' is too broad
  // For this implementation, we'll use the passed globalSetIsScanning carefully.
  // Consider if this should be a *different* loading indicator to not block UI for a background task.
  // globalSetIsScanning(true); // Avoid using global isScanning if possible for background tasks like this.

  try {
    const geminiPayload = {
      productName: product.name,
      ingredients: product.ingredients,
      currentStatus: product.status?.status,
    };
    
    // Use our API service to check gluten status with Gemini
    const geminiResponse = await geminiApi.checkGlutenStatus(geminiPayload);

    if (geminiResponse.error) {
      throw new Error(`Gemini API for gluten check failed: ${geminiResponse.error}`);
    }

    if (!geminiResponse.data?.success || !geminiResponse.data?.glutenFreeStatus) {
      throw new Error('Gemini gluten check was not successful or status missing');
    }

    const { glutenFreeStatus, explanation } = geminiResponse.data;

    if (glutenFreeStatus !== product.status?.status) {
      console.log(`AI suggests updating status for ${product.barcode} from ${product.status.status} to ${glutenFreeStatus}`);
      if (!authToken) {
        // Not throwing error here, just logging, as scan already succeeded.
        // But status update won't happen.
        console.error("Auth token not available for status update.");
        return product.status; // Return original status as update cannot proceed
      }

      const statusUpdatePayload = { status: glutenFreeStatus, explanation: explanation || '' };
      
      // Use our API service to update the product status
      const backendUpdateResponse = await statusApi.updateProductStatus(
        product.barcode, 
        statusUpdatePayload, 
        authToken
      );

      if (backendUpdateResponse.error) {
        console.error(`Backend status update failed for ${product.barcode}: ${backendUpdateResponse.error}`);
        // Return original status as update failed
        return product.status;
      }
      
      // Toast for this specific background update
      toast({ 
        title: "AI Gluten Check", 
        description: `Product '${product.name}' status updated to '${glutenFreeStatus}'. ${explanation ? `Reason: ${explanation}` : ''}`
      });
      
      return backendUpdateResponse.data; // Return the new status object from backend
    } else {
      console.log(`No status change suggested by AI for ${product.barcode}. Current: ${product.status.status}`);
      // Toast for no change is optional, could be noisy.
      // toast({ title: "AI Gluten Check", description: `No change to gluten status for '${product.name}'.`});
      return product.status; // Return original status
    }
  } catch (error) {
    console.error(`Error during gluten status check for ${product.barcode}:`, error);
    // Toast for failure of this background task
    toast({ title: "AI Gluten Check Failed", description: (error as Error).message, variant: "destructive" });
    return product.status; // Return original status on error to avoid reverting a potentially correct manual status
  } finally {
    // globalSetIsScanning(false); // Reset if it was set specifically for this sub-process
    // As decided, this function should not manage the global isScanning state.
    // The main recordScan onSuccess will handle the primary isScanning.
  }
};

  const { mutate: recordScan, isLoading: isRecordingScan, reset: resetScanMutation } = useMutation(
    (scanData: CreateScanData) => createScanApi(scanData),
    {
      onSuccess: async (data: ScanType) => { // Added async and type for data
        toast({
          title: "Scan Recorded!",
          description: `Product (Barcode: ${data.productBarcode}) scan has been added to your journal.`,
        });
        // The main setIsScanning(false) is called before this background check.
        setIsScanning(false);

        // Perform gluten status check in the background
        if (data.product && data.product.createdAt && data.product.status && typeof data.product.ingredients === 'string') {
          // Ensure 'token' from useAuth() is accessible here
          const updatedProductStatus = await checkAndProcessGlutenStatus(data.product as ProductInScan, token, setIsScanning);

          if (updatedProductStatus && updatedProductStatus.status !== data.product.status.status) {
            // A toast is already shown in checkAndProcessGlutenStatus for the update.
            // Optionally, show another summary toast or rely on the one from the function.
            // toast({
            //   title: "Product Status Updated by AI",
            //   description: `Status for ${data.product.name} is now ${updatedProductStatus.status}.`
            // });

            // Invalidate queries to reflect the updated product status elsewhere in the app
            queryClient.invalidateQueries({ queryKey: ['product', data.productBarcode] });
            queryClient.invalidateQueries({ queryKey: ['recentScans'] }); // If recent scans display status
            // Potentially invalidate other queries that might use this product's status
          }
        } else {
          console.log("Product data not available or incomplete in scan response, skipping AI gluten check.", data.product);
        }

        queryClient.invalidateQueries({ queryKey: ['recentScans'] });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] }); // For streak
        queryClient.invalidateQueries({ queryKey: ['product', data.productBarcode] });
        // Potentially navigate to the product page or recent scans
        // navigate(`/product/${data.productBarcode}`);
      },
      onError: async (error: Error, variables: CreateScanData) => { // variables are the input to the mutation
        const typedError = error as any; // To access custom properties
        const currentBarcode = typedError.barcode || variables.productBarcode;

        if (typedError.isProductNotFound && currentBarcode) {
          setIsScanning(true); // Show loading for OFF lookup
          toast({
            title: "Product Not Found",
            description: `Searching Open Food Facts for barcode: ${currentBarcode}...`,
            duration: 3000, // Keep this toast shorter as it might be replaced
          });

          // 'token' is from useAuth() at the component scope
          const offResult = await fetchProductFromOpenFoodFacts(currentBarcode, token);

          if (offResult.success) {
            toast({
              title: "Product Added!",
              description: "Found on Open Food Facts and added to our database. Recording your scan...",
              duration: 5000,
            });
            // processBarcode calls recordScan again, which will use isScanning state.
            // recordScan's onSuccess/onError will handle setIsScanning(false) for this new attempt.
            processBarcode(currentBarcode);
          } else if (offResult.reason === 'OFF_NOT_FOUND') {
            setCurrentBarcodeForUpload(currentBarcode);
            setUploadedImages([]); // Clear any previous images for the new product
            setShowUploadModal(true);
            toast({
              title: "Not on Open Food Facts",
              description: "Please help add this product by uploading its images.",
              duration: 7000, // Longer duration as it requires user action
            });
            setIsScanning(false); // User interaction needed, so stop general scanning indicator
          } else {
            // Handles 'DB_SAVE_FAILED', 'AUTH_ERROR', 'OFF_API_ERROR', 'ERROR'
            toast({
              title: "Product Processing Error",
              description: offResult.message || "Could not process product information from Open Food Facts.",
              variant: "destructive",
            });
            setIsScanning(false);
          }
        } else {
          // Generic error (not product not found, or barcode missing for some reason)
          toast({
            title: "Failed to Record Scan",
            description: `${error.message || "An unexpected error occurred."} (Barcode: ${currentBarcode || 'unknown'})`,
            variant: "destructive",
          });
          setIsScanning(false);
        }
      },
    }
  );

  React.useEffect(() => {
    if (isCameraOpen && isMobile) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { // Cleanup
      stopCamera();
    };
  }, [isCameraOpen, isMobile]);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const streamData = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(streamData);
        if (videoRef.current) {
          videoRef.current.srcObject = streamData;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        toast({ title: "Camera Error", description: "Could not access camera. Please check permissions.", variant: "destructive" });
        setIsCameraOpen(false);
      }
    } else {
      toast({ title: "Camera Not Supported", description: "Your browser does not support camera access.", variant: "destructive" });
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleScan = () => {
    if (isMobile) {
      setIsCameraOpen(true);
      // startCamera will be called by useEffect
    }
  };

  const processBarcode = (barcode: string) => {
    setIsScanning(true);
    recordScan({
      productBarcode: barcode,
      date: new Date().toISOString(),
      symptoms: [],
    });
  };

  const handleCameraScan = async () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            console.log("Image captured, attempting to scan barcode...");
            setIsScanning(true);
            try {
              // Use the barcode API service which now uses the browser-based scanner
              const response = await barcodeApi.scanBarcodeFromImage(blob);
              
              if (response.error) {
                throw new Error(response.error);
              }
              
              if (response.data?.barcode) {
                console.log("Barcode scanned:", response.data.barcode);
                processBarcode(response.data.barcode);
                // setIsScanning(false) will be handled by recordScan's onSuccess/onError
              } else {
                toast({ title: "Barcode Scan Failed", description: "No barcode detected in the image.", variant: "destructive" });
                setIsScanning(false);
              }
            } catch (error) {
              console.error("Barcode scanning failed:", error);
              toast({ title: "Barcode Scan Error", description: (error as Error).message || "Could not scan barcode.", variant: "destructive" });
              setIsScanning(false);
            }
          } else {
            toast({ title: "Failed to capture image", variant: "destructive" });
          }
        }, 'image/jpeg');
      } else {
        toast({ title: "Failed to get canvas context", variant: "destructive" });
      }
    } else {
      toast({ title: "Camera not ready", description: "Video stream or canvas not available.", variant: "destructive" });
    }
    // Stop camera and close UI regardless of scan outcome, happens after blob processing
    stopCamera();
    setIsCameraOpen(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsScanning(true); // Indicate processing started

    try {
      // Use the barcode API service which now uses the browser-based scanner
      const response = await barcodeApi.scanBarcodeFromImage(file);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data?.barcode) {
        processBarcode(response.data.barcode); // Centralized logic for what to do with the barcode
      } else {
        toast({
          title: "Barcode Not Found",
          description: "Could not detect a barcode in the uploaded image.",
          variant: "destructive",
        });
        setIsScanning(false); // Reset scanning state if no barcode
      }
    } catch (error) {
      toast({
        title: "Image Scan Error",
        description: (error as Error).message || "An error occurred while scanning the image.",
        variant: "destructive",
      });
      setIsScanning(false); // Reset scanning state on error
    } finally {
      // Clear the file input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleMultipleImageUpload = async () => {
    if (uploadedImages.length < 4) {
      toast({
        title: "More Images Needed",
        description: `Please upload at least 4 images. Current: ${uploadedImages.length}`,
        variant: "destructive",
      });
      return;
    }
    if (!currentBarcodeForUpload) {
      toast({
        title: "Error",
        description: "No barcode associated with this upload. Please try scanning again.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    // setShowUploadModal(false); // Keep modal open initially, close in finally or on success

    try {
      const base64Images = await Promise.all(uploadedImages.map(fileToBase64));

      // Define the prompt for Gemini
      const prompt = `Analyze these images to identify the product name and ingredients.
      The product has barcode: ${currentBarcodeForUpload}.
      Provide name and ingredients.`;

      // Use our API service to call Gemini
      const geminiResponse = await geminiApi.generateProductInfo(base64Images, prompt);

      if (geminiResponse.error) {
        throw new Error(`Gemini API failed: ${geminiResponse.error}`);
      }

      if (!geminiResponse.data?.success || !geminiResponse.data?.product) {
        throw new Error('Failed to get product info from AI.');
      }

      const geminiProduct = geminiResponse.data.product;

      // Use the first uploaded image for pictureUrl with real S3 upload
      const firstImageUrl = await uploadImageToServer(uploadedImages[0], `products/${currentBarcodeForUpload}`);

      const productPayload = {
        barcode: currentBarcodeForUpload,
        name: geminiProduct.name || 'Unknown Product (from AI)',
        ingredients: geminiProduct.ingredients || '',
        pictureUrl: firstImageUrl,
      };

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      // Save the new product to the backend using our API service
      const backendResponse = await productApi.createProduct(productPayload, token);

      if (backendResponse.error) {
        throw new Error(`Failed to save AI-generated product: ${backendResponse.error}`);
      }

      toast({
        title: "Product Added with AI!",
        description: "The new product information has been saved. Recording your scan...",
      });
      setShowUploadModal(false); // Close modal on full success
      processBarcode(currentBarcodeForUpload); // This will set isScanning for recordScan

    } catch (error) {
      console.error("Error in handleMultipleImageUpload:", error);
      toast({
        title: "AI Product Creation Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
      setIsScanning(false); // Reset scanning if AI/backend product creation fails
    } finally {
      // Clean up states, modal remains open if there was an error and not explicitly closed
      // If setShowUploadModal(false) was called on success, this is fine.
      // If an error occurred, we might want to keep the modal open for user to retry/cancel.
      // For now, the prompt implies closing it primarily on success.
      // Let's ensure uploadedImages and currentBarcodeForUpload are cleared if modal is hidden or on success.
      if (!showUploadModal || (showUploadModal && !isScanning) ) { // if modal closed or processing stopped
         setUploadedImages([]);
         setCurrentBarcodeForUpload(null);
      }
    }
  };

  if (isScanning) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px] bg-background">
        <Card className="w-full max-w-sm text-center bg-card">
          <CardContent className="p-8">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold mb-2 text-readable">
              {uploadedImages.length > 0 ? 'Processing Images...' : 'Scanning Product...'}
            </h3>
            <p className="text-readable-muted">
              {uploadedImages.length > 0 
                ? 'Please wait while we analyze your images and add the product to our database'
                : 'Please wait while we analyze your product'
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCameraOpen && isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 text-white">
          <button 
            onClick={() => setIsCameraOpen(false)}
            className="p-2 rounded-full bg-black/50"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Scan Product</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-gray-900">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay for barcode scanning guidance - can be kept or modified */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-32 border-4 border-primary opacity-75 rounded-lg relative">
              {/* Optional corner markers if desired for styling */}
              {/* <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div> */}
            </div>
          </div>
           <p className="absolute bottom-16 text-white text-center text-sm p-2 bg-black/50 rounded">
            Position barcode within the frame
          </p>
        </div>

        <div className="p-6 bg-black/80 text-white">
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={handleCameraScan}
              className="bg-white text-black px-8 py-3 text-lg hover:bg-gray-200"
            >
              <Camera className="w-6 h-6 mr-2" />
              Scan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-background min-h-screen">
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full gradient-bg mx-auto mb-4 flex items-center justify-center text-2xl text-white">
          📱
        </div>
        <h1 className="text-2xl font-bold gradient-text">Scan Product</h1>
        <p className="text-readable-muted">Discover what's in your food</p>
      </div>

      <div className="space-y-4">
        {isMobile && (
          <Button 
            onClick={handleScan}
            className="w-full py-6 bg-primary text-primary-foreground text-lg hover:bg-primary/90"
          >
            <Camera className="w-6 h-6 mr-3" />
            Open Camera Scanner
          </Button>
        )}

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="file-upload"
          />
          <Button 
            variant="outline" 
            className="w-full py-6 border-border text-foreground text-lg hover:bg-accent"
            asChild
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-6 h-6 mr-3" />
              Upload Product Image
            </label>
          </Button>
        </div>

        <Button 
          variant="outline" 
          className="w-full py-4 border-border text-foreground hover:bg-accent"
          onClick={() => navigate('/recent-scans')}
        >
          <Clock className="w-5 h-5 mr-2" />
          View All Scans
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-foreground">Recent Scans</h3>
          <RecentScansSection token={token} />
        </CardContent>
      </Card>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Product Not Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help us add this product to our database by uploading 4-8 images of all product sides.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({length: 8}).map((_, i) => (
                    <div key={i} className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                      {uploadedImages[i] ? (
                        <img 
                          src={URL.createObjectURL(uploadedImages[i])} 
                          alt={`Upload ${i+1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs text-center">
                          Image {i+1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setUploadedImages(prev => [...prev, ...files].slice(0, 8)); // Limit to 8 images
                    }
                    if (e.target) e.target.value = ''; // Clear input
                  }}
                  className="hidden"
                  id="multiple-upload"
                />
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => document.getElementById('multiple-upload')?.click()}
                    variant="outline"
                    className="flex-1"
                    disabled={isScanning} // Disable if any scanning operation is in progress
                  >
                    Add Images ({uploadedImages.length}/8)
                  </Button>
                  <Button 
                    onClick={handleMultipleImageUpload}
                    className="flex-1 gradient-bg text-white"
                    disabled={uploadedImages.length < 4 || isScanning}
                  >
                    Submit
                  </Button>
                </div>
                
                <Button 
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadedImages([]);
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Helper component to load and display recent scans
const RecentScansSection: React.FC<{ token: string | null }> = ({ token }) => {
  const navigate = useNavigate();
  const { data: recentScans, isLoading, error } = useQuery({
    queryKey: ['recentScans'],
    queryFn: async () => {
      if (!token) return [];
      const response = await scanApi.getRecentScans(token, 3); // Get 3 most recent scans
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: !!token, // Only run if we have a token
  });

  if (isLoading) {
    return (
      <div className="p-3 text-center text-muted-foreground">
        Loading recent scans...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-center text-red-500">
        Failed to load recent scans
      </div>
    );
  }

  if (!recentScans?.length) {
    return (
      <div className="p-3 text-center text-muted-foreground">
        No recent scans found
      </div>
    );
  }

  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-3">
      {recentScans.map((scan: any, index: number) => (
        <div 
          key={index} 
          className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded"
          onClick={() => navigate(`/product/${scan.productBarcode}`)}
        >
          <div>
            <div className="font-medium text-sm text-foreground">
              {scan.product?.name || `Product ${scan.productBarcode}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {getRelativeTime(scan.date)}
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            scan.product?.status?.status === 'gluten-free' ? 'bg-green-500' : 
            scan.product?.status?.status === 'unknown' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
        </div>
      ))}
    </div>
  );
};

export default ScanTab;
