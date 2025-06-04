import { toast } from '@/hooks/use-toast';

// Base URL configuration (should be moved to environment variables in production)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'; // Default to localhost if not set

const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

// Open Food Facts configuration (no key needed)
const OFF_API_URL = 'https://world.openfoodfacts.org/api/v3';

// Type definitions for API responses
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Helper function to get auth header
const getAuthHeader = (token: string | null): HeadersInit => {
  return token 
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};

// Generic function to handle API errors
const handleApiError = async (response: Response): Promise<ApiResponse<never>> => {
  try {
    const errorData = await response.json();
    return {
      error: errorData.message || errorData.error || `API error: ${response.status}`,
      status: response.status
    };
  } catch (e) {
    return {
      error: `API error: ${response.status} ${response.statusText}`,
      status: response.status
    };
  }
};

// Generic fetch function with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  customBaseUrl?: string
): Promise<ApiResponse<T>> {
  const url = customBaseUrl ? `${customBaseUrl}${endpoint}` : `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      return handleApiError(response);
    }
    
    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    console.error("API call failed:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown API error occurred",
      status: 0 // 0 indicates network error or other client-side issue
    };
  }
}

// =====================
// Auth API functions
// =====================
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<{token: string, user: any}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        return handleApiError(response);
      }
      
      // The backend returns { token, user } directly
      const data = await response.json();
      
      // Ensure we have the expected structure
      if (!data.token) {
        return {
          error: 'Invalid response format: Missing token',
          status: response.status
        };
      }
      
      return { 
        data: {
          token: data.token,
          user: data.user
        }, 
        status: response.status 
      };
    } catch (error) {
      console.error("Login API call failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown login error",
        status: 0
      };
    }
  },
  
  register: async (name: string, email: string, password: string): Promise<ApiResponse<{token: string, user: any}>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      if (!response.ok) {
        return handleApiError(response);
      }
      
      const data = await response.json();
      
      // For registration, we might get a saved user object with _id
      // Or a token+user object if the backend is set up to automatically log in after registration
      if (data._id) {
        // Just a user object returned, no token (depends on backend implementation)
        return { 
          data: {
            token: `temp-token-${Date.now()}`, // Temporary token until login
            user: data
          }, 
          status: response.status 
        };
      } else if (data.token) {
        // Both token and user were returned
        return { 
          data: {
            token: data.token,
            user: data.user || data
          }, 
          status: response.status 
        };
      } else {
        return {
          error: 'Invalid response format from registration',
          status: response.status
        };
      }
    } catch (error) {
      console.error("Registration API call failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown registration error",
        status: 0
      };
    }
  },
  
  getCurrentUser: async (token: string): Promise<ApiResponse<any>> => {
    try {
      console.log("getCurrentUser called with token:", token ? "Valid token" : "No token");
      
      if (!token) {
        return {
          error: "No authentication token provided",
          status: 401
        };
      }
      
      // Make a direct fetch to diagnose the issue more clearly
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("getCurrentUser response status:", response.status);
      
      if (!response.ok) {
        console.error("Error fetching current user:", response.status, response.statusText);
        return {
          error: `Error fetching user: ${response.status} ${response.statusText}`,
          status: response.status
        };
      }
      
      const userData = await response.json();
      console.log("User data from API:", userData);
      
      if (!userData) {
        console.error("User data is null or undefined from API");
        return {
          error: "User data is null or undefined from API",
          status: 200  // The response was OK but data is missing
        };
      }
      
      // Check if the user data has the expected format
      if (!userData.id && !userData._id) {
        console.warn("User data missing ID field:", userData);
      }
      
      return {
        data: userData,
        status: response.status
      };
    } catch (error) {
      console.error("API call to fetch current user failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error fetching user",
        status: 0
      };
    }
  }
};

// =====================
// Product API functions
// =====================
export const productApi = {
  getProduct: async (barcode: string, token: string | null): Promise<ApiResponse<any>> => {
    return apiFetch(`/api/products/${barcode}`, {
      headers: getAuthHeader(token)
    });
  },
  
  searchProducts: async (query: string, cursor?: string, limit: number = 10, token: string | null = null): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    
    return apiFetch(`/api/products/search?${params.toString()}`, {
      headers: getAuthHeader(token)
    });
  },
  
  createProduct: async (productData: any, token: string): Promise<ApiResponse<any>> => {
    return apiFetch('/api/products', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify(productData)
    });
  }
};

// =====================
// Scan API functions
// =====================
export const scanApi = {
  recordScan: async (scanData: { productBarcode: string, date: string, symptoms?: string[] }, token: string): Promise<ApiResponse<any>> => {
    return apiFetch('/api/scans', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify(scanData)
    });
  },
  
  getRecentScans: async (token: string, limit?: number): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    return apiFetch(`/api/scans?${params.toString()}`, {
      headers: getAuthHeader(token)
    });
  }
};

// =====================
// Status API functions
// =====================
export const statusApi = {
  updateProductStatus: async (barcode: string, statusData: { status: string, explanation: string }, token: string): Promise<ApiResponse<any>> => {
    return apiFetch(`/api/status/${barcode}`, {
      method: 'PATCH',
      headers: getAuthHeader(token),
      body: JSON.stringify(statusData)
    });
  }
};

// =====================
// Open Food Facts API
// =====================
export const openFoodFactsApi = {
  getProduct: async (barcode: string): Promise<ApiResponse<any>> => {
    return apiFetch(`/product/${barcode}.json`, {}, OFF_API_URL);
  }
};

// =====================
// Barcode Scanner API
// =====================
import { scanBlobForBarcode } from './barcodeScanner';

export const barcodeApi = {
  scanBarcodeFromImage: async (imageBlob: Blob): Promise<ApiResponse<{barcode: string}>> => {
    try {
      // Use the browser-based barcode scanner instead of an external API
      const barcode = await scanBlobForBarcode(imageBlob);
      
      if (barcode) {
        return { data: { barcode }, status: 200 };
      } else {
        return { error: "No barcode detected in the image", status: 404 };
      }
    } catch (error) {
      console.error("Barcode scan failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error scanning barcode",
        status: 0
      };
    }
  }
};

// =====================
// Gemini AI API
// =====================
export const geminiApi = {
  generateProductInfo: async (images: string[], prompt: string): Promise<ApiResponse<any>> => {
    if (!GEMINI_API_KEY) {
      toast({
        title: "API Key Missing",
        description: "Google Gemini API key is not configured.",
        variant: "destructive"
      });
      return { error: "Gemini API key is not configured", status: 0 };
    }
    
    // Format the request according to Gemini API requirements
    const requestData = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...images.map(image => ({
              inlineData: {
                mimeType: "image/jpeg",
                data: image.split("base64,")[1] // Remove the data:image/jpeg;base64, prefix
              }
            }))
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      }
    };
    
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        }
      );
      
      if (!response.ok) {
        return handleApiError(response);
      }
      
      const data = await response.json();
      
      // Extract the relevant text from Gemini's response
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse the response text to extract product name and ingredients
      // This is a simple approach; might need more sophisticated parsing depending on Gemini's output format
      const productInfo = extractProductInfoFromGeminiResponse(responseText);
      
      return { 
        data: {
          success: true,
          product: productInfo
        }, 
        status: 200 
      };
    } catch (error) {
      console.error("Gemini API call failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error with Gemini AI",
        status: 0
      };
    }
  },
  
  checkGlutenStatus: async (productData: { productName: string, ingredients: string, currentStatus?: string }): Promise<ApiResponse<any>> => {
    if (!GEMINI_API_KEY) {
      toast({
        title: "API Key Missing",
        description: "Google Gemini API key is not configured.",
        variant: "destructive"
      });
      return { error: "Gemini API key is not configured", status: 0 };
    }
    
    const prompt = `
      You are a gluten analysis expert. Analyze this product to determine if it contains gluten.
      
      Product name: ${productData.productName}
      Ingredients: ${productData.ingredients}
      Current gluten status: ${productData.currentStatus || 'unknown'}
      
      Return a JSON object with these fields:
      - glutenFreeStatus: One of "gluten-free", "contains-gluten", or "unknown"
      - explanation: A brief explanation for your assessment
      
      If ingredients contain wheat, barley, rye, or their derivatives, classify as "contains-gluten".
      If you're uncertain, classify as "unknown".
    `;
    
    const requestData = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    };
    
    try {
      const response = await fetch(
        `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        }
      );
      
      if (!response.ok) {
        return handleApiError(response);
      }
      
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from the response (Gemini might wrap it in markdown code blocks)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        responseText.match(/{[\s\S]*?}/);
      
      let glutenInfo;
      if (jsonMatch) {
        try {
          glutenInfo = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
        } catch (e) {
          // If JSON parsing fails, attempt to extract the information using regex
          glutenInfo = extractGlutenInfoFromText(responseText);
        }
      } else {
        glutenInfo = extractGlutenInfoFromText(responseText);
      }
      
      return { 
        data: {
          success: true,
          glutenFreeStatus: glutenInfo.glutenFreeStatus || 'unknown',
          explanation: glutenInfo.explanation || 'Unable to determine'
        }, 
        status: 200 
      };
    } catch (error) {
      console.error("Gemini API call failed:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error with Gemini AI",
        status: 0
      };
    }
  }
};

// Helper function to extract product info from Gemini response
function extractProductInfoFromGeminiResponse(text: string): { name: string, ingredients: string } {
  // Default values
  let productInfo = {
    name: 'Unknown Product',
    ingredients: ''
  };
  
  // Look for name
  const nameMatch = text.match(/Product name:?\s*([^\n]+)/i) ||
                    text.match(/Name:?\s*([^\n]+)/i);
  if (nameMatch && nameMatch[1].trim()) {
    productInfo.name = nameMatch[1].trim();
  }
  
  // Look for ingredients
  const ingredientsMatch = text.match(/Ingredients:?\s*([^\n]+(?:\n[^\n]+)*)/i);
  if (ingredientsMatch && ingredientsMatch[1].trim()) {
    productInfo.ingredients = ingredientsMatch[1].trim();
  }
  
  return productInfo;
}

// Helper function to extract gluten info when JSON parsing fails
function extractGlutenInfoFromText(text: string): { glutenFreeStatus: string, explanation: string } {
  // Default values
  let glutenInfo = {
    glutenFreeStatus: 'unknown',
    explanation: 'Unable to determine from AI response'
  };
  
  // Look for gluten status
  if (text.match(/gluten[- ]free/i) && !text.match(/not gluten[- ]free/i)) {
    glutenInfo.glutenFreeStatus = 'gluten-free';
  } else if (text.match(/contains gluten|has gluten|gluten[- ]containing/i)) {
    glutenInfo.glutenFreeStatus = 'contains-gluten';
  }
  
  // Look for explanation
  const explanationMatch = text.match(/explanation:?\s*([^\n]+(?:\n[^\n]+)*)/i) ||
                          text.match(/analysis:?\s*([^\n]+(?:\n[^\n]+)*)/i) ||
                          text.match(/assessment:?\s*([^\n]+(?:\n[^\n]+)*)/i);
  if (explanationMatch && explanationMatch[1].trim()) {
    glutenInfo.explanation = explanationMatch[1].trim();
  }
  
  return glutenInfo;
}

