import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names
import { toast } from "@/hooks/use-toast";

// Define the response type to match our API service pattern
export interface S3UploadResponse {
  data?: { fileUrl: string };
  error?: string;
  status: number;
}

// Configure S3 Client
const S3_BUCKET_NAME = import.meta.env.VITE_AWS_S3_BUCKET_NAME;
const S3_REGION = import.meta.env.VITE_AWS_S3_REGION;
const S3_ACCESS_KEY_ID = import.meta.env.VITE_AWS_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_S3_SECRET_ACCESS_KEY;
const S3_PUBLIC_URL = import.meta.env.VITE_AWS_S3_PUBLIC_URL; // Optional: For custom domain/CDN

// Configuration validation with detailed messages
const validateS3Config = (): string | null => {
  if (!S3_BUCKET_NAME) return "AWS S3 bucket name is not configured";
  if (!S3_REGION) return "AWS S3 region is not configured";
  if (!S3_ACCESS_KEY_ID) return "AWS S3 access key ID is not configured";
  if (!S3_SECRET_ACCESS_KEY) return "AWS S3 secret access key is not configured";
  return null; // All configs are valid
};

// Get a configured S3 client
const getS3Client = (): S3Client | null => {
  const configError = validateS3Config();
  if (configError) {
    console.error(`AWS S3 configuration error: ${configError}`);
    return null;
  }

  return new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID!,
      secretAccessKey: S3_SECRET_ACCESS_KEY!,
    },
  });
};

// Validate file before upload
const validateFile = (file: File): string | null => {
  // Basic image type validation
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    return 'Invalid file type. Only JPG, PNG, GIF, WEBP are allowed.';
  }

  // Size validation (e.g., max 5MB)
  const MAX_FILE_SIZE_MB = 5;
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
  }

  return null; // File is valid
};

// Construct the file URL
const constructFileUrl = (s3Key: string): string => {
  if (S3_PUBLIC_URL) {
    // Use custom domain/CDN if provided
    return `${S3_PUBLIC_URL}/${s3Key}`;
  }
  // Default S3 URL format
  return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;
};

/**
 * Upload a file to AWS S3
 * @param file The file to upload
 * @param pathPrefix Optional folder path prefix (default: "uploads/")
 * @param makePublic Whether to set ACL to public-read (default: true)
 * @returns Promise resolving to an S3UploadResponse object
 */
export const uploadFileToS3 = async (
  file: File, 
  pathPrefix: string = "uploads/",
  makePublic: boolean = true
): Promise<S3UploadResponse> => {
  // Validate S3 configuration
  const configError = validateS3Config();
  if (configError) {
    toast({
      title: "AWS S3 Configuration Error",
      description: configError,
      variant: "destructive"
    });
    return { error: configError, status: 0 };
  }

  // Get S3 client
  const s3Client = getS3Client();
  if (!s3Client) {
    return { error: "Could not initialize S3 client", status: 0 };
  }

  // Validate file
  const fileError = validateFile(file);
  if (fileError) {
    toast({
      title: "File Validation Error",
      description: fileError,
      variant: "destructive"
    });
    return { error: fileError, status: 400 };
  }

  // Generate a unique file name
  const fileExtension = file.name.split('.').pop() || '';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const s3Key = `${pathPrefix.endsWith('/') ? pathPrefix : pathPrefix + '/'}${uniqueFileName}`;

  // Prepare upload parameters
  const params = {
    Bucket: S3_BUCKET_NAME!,
    Key: s3Key,
    Body: file,
    ContentType: file.type,
    ACL: makePublic ? 'public-read' : undefined,
  };

  try {
    // Upload to S3
    await s3Client.send(new PutObjectCommand(params));
    
    // Construct the file URL
    const fileUrl = constructFileUrl(s3Key);
    console.log("Successfully uploaded to:", fileUrl);
    
    return {
      data: { fileUrl },
      status: 200
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    
    // Provide detailed error messages based on the error type
    const err = error as Error & { 
      $metadata?: { httpStatusCode?: number },
      name?: string,
      code?: string
    };
    
    let errorMessage = "Failed to upload file to S3";
    let statusCode = 500;
    
    if (err.$metadata?.httpStatusCode) {
      statusCode = err.$metadata.httpStatusCode;
      
      if (statusCode === 403) {
        errorMessage = "Access denied uploading to S3. Check credentials and permissions.";
      } else if (statusCode === 404) {
        errorMessage = "S3 bucket not found. Check your bucket name and region.";
      }
    }
    
    if (err.code === 'NetworkError') {
      errorMessage = "Network error while uploading to S3. Check your internet connection.";
      statusCode = 0;
    }
    
    toast({
      title: "Upload Failed",
      description: errorMessage,
      variant: "destructive"
    });
    
    return { 
      error: errorMessage, 
      status: statusCode
    };
  }
};
