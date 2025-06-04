
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, X, Loader2, AlertCircle } from 'lucide-react'; // Added Loader2 and AlertCircle
import { toast } from '@/hooks/use-toast';
import { uploadFileToS3 } from '@/lib/s3upload'; // Import the S3 upload utility
import { v4 as uuidv4 } from 'uuid';

// Define the state for each image being handled
interface UploadableImage {
  id: string; // Unique ID for React key and managing individual uploads
  file?: File; // Original file, kept until upload is done or if retry is needed
  previewUrl: string; // Local data URL for preview OR existing S3 URL
  s3Url?: string; // Populated after successful S3 upload
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string; // Error message if upload fails
  // progress?: number; // Optional: for upload progress display (not implemented in this version)
}

interface ImageUploadProps {
  images: string[]; // Initial images (S3 URLs)
  onImagesChange: (s3Urls: string[]) => void; // Callback with array of S3 URLs
  maxImages?: number;
  pathPrefix?: string; // Optional S3 path prefix (e.g., "posts/", "avatars/")
  buttonText?: string; // Optional text for the upload button
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  images: initialS3Urls, // Renamed for clarity
  onImagesChange, 
  maxImages = 5,
  pathPrefix = "uploads/", // Default path prefix
  buttonText = "Add Images"
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadableImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to initialize state when initialS3Urls prop changes
  useEffect(() => {
    const initialUploadableImages = initialS3Urls.map(url => ({
      id: uuidv4(),
      previewUrl: url,
      s3Url: url,
      status: 'success' as 'success', // Type assertion
      file: undefined,
    }));
    setUploadedImages(initialUploadableImages);
  }, [initialS3Urls]);


  const startUpload = async (imageToUpload: UploadableImage) => {
    if (!imageToUpload.file) return;

    // Update status to 'uploading'
    setUploadedImages(prev => prev.map(img =>
      img.id === imageToUpload.id ? { ...img, status: 'uploading', error: undefined } : img
    ));

    try {
      const s3Url = await uploadFileToS3(imageToUpload.file, pathPrefix);
      setUploadedImages(prev => prev.map(img =>
        img.id === imageToUpload.id ? { ...img, status: 'success', s3Url, file: undefined } : img
      ));
    } catch (error) {
      console.error("Upload failed for image:", imageToUpload.id, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown upload error";
      setUploadedImages(prev => prev.map(img =>
        img.id === imageToUpload.id ? { ...img, status: 'error', error: errorMessage } : img
      ));
    }
  };

  // Effect to trigger onImagesChange when uploadedImages (specifically s3Urls) change
  useEffect(() => {
    const successfulS3Urls = uploadedImages
      .filter(img => img.status === 'success' && img.s3Url)
      .map(img => img.s3Url!);
    onImagesChange(successfulS3Urls);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImages.map(img => img.s3Url).join(',')]); // Depend on a string of s3Urls to detect changes accurately

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const currentImageCount = uploadedImages.length;
    const remainingSlots = maxImages - currentImageCount;

    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only add ${remainingSlots} more image(s). Maximum ${maxImages} images allowed.`,
        variant: "destructive"
      });
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    const newUploadableImages: UploadableImage[] = [];

    filesToProcess.forEach((file) => {
      // Client-side validation (type)
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image type. Only JPG, PNG, GIF, WEBP are allowed.`,
          variant: "destructive"
        });
        return; // Skip this file
      }
      // Client-side validation (size) - S3 utility also validates, but good for UX
      const MAX_FILE_SIZE_MB = 5;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
         toast({
          title: "File too large",
          description: `${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`,
          variant: "destructive"
        });
        return; // Skip this file
      }

      const newImage: UploadableImage = {
        id: uuidv4(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      };
      newUploadableImages.push(newImage);
    });

    if (newUploadableImages.length > 0) {
      setUploadedImages(prev => [...prev, ...newUploadableImages]);
      newUploadableImages.forEach(img => startUpload(img)); // Start upload for each new valid image
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (idToRemove: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === idToRemove);
    // If image was successfully uploaded, its previewUrl might be an object URL that needs revoking
    if (imageToRemove && imageToRemove.file && imageToRemove.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }
    // TODO: If image is currently uploading, ideally cancel the S3 upload.
    // PutObjectCommand doesn't support cancellation directly. For that, @aws-sdk/lib-storage Upload is needed.
    // For now, we just remove it from UI. It might still upload in background.
    setUploadedImages(prev => prev.filter(img => img.id !== idToRemove));
    // onImagesChange will be called by the useEffect hook listening to uploadedImages changes
  };

  const retryUpload = (idToRetry: string) => {
    const imageToRetry = uploadedImages.find(img => img.id === idToRetry);
    if (imageToRetry && imageToRetry.file && imageToRetry.status === 'error') {
      startUpload(imageToRetry);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      {uploadedImages.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp" // More specific accept
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            {buttonText} ({uploadedImages.length}/{maxImages})
          </Button>
        </div>
      )}

      {/* Image Previews */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group aspect-square">
              <img
                src={image.previewUrl} // Use local preview URL or S3 URL if uploaded
                alt={`Upload preview ${image.id}`}
                className="w-full h-full object-cover rounded-lg border"
                onLoad={() => {
                  // Revoke object URL if it's a blob and image is successfully displayed (and not an S3 URL)
                  // However, we need it for retry if file still exists.
                  // Only revoke if status is success and it was a blob.
                  if (image.status === 'success' && image.previewUrl.startsWith('blob:') && !image.file) {
                     URL.revokeObjectURL(image.previewUrl);
                  }
                }}
              />
              {/* Remove Button */}
              <Button
                type="button"
                variant="destructive"
                size="icon" // Made it icon size
                onClick={() => removeImage(image.id)}
                className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Status Indicators */}
              {image.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {image.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/70 rounded-lg p-1 text-center">
                  <AlertCircle className="w-6 h-6 text-white mb-1" />
                  <p className="text-xs text-white overflow-hidden text-ellipsis" title={image.error}>
                    {image.error?.substring(0, 30) || "Upload failed"}
                  </p>
                  {image.file && ( // Show retry only if original file is still available
                     <Button size="xs" variant="secondary" onClick={() => retryUpload(image.id)} className="mt-1 h-6 px-2 py-1 text-xs">Retry</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
