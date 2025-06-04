
export interface UserSettings {
  theme: boolean; // false for light, true for dark
  telegram_notifications: boolean;
  telegram_number?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  pfp: string; // Default is a URL, so it should always be a string
  settings: UserSettings;
  streak: number;
  following?: string[] | User[]; // Array of user IDs or populated User objects
  followers?: string[] | User[]; // Array of user IDs or populated User objects
  scans?: string[] | Scan[]; // Array of scan IDs or populated Scan objects
  symptoms?: string[] | Symptom[]; // Array of symptom IDs or populated Symptom objects
  createdAt?: string; // From existing type, keep if API sends it
}

// Basic Ref types, can be expanded if API populates them
export interface StatusRef {
  id: string;
  name: string; // e.g., "Gluten-Free", "May Contain Gluten"
  level: 1 | 2 | 3 | 4 | 5; // Numeric representation if available
  description?: string;
}

export interface SymptomRef {
  id: string;
  name: string;
  // Potentially other fields if populated
}

export interface ClaimRef {
  id: string;
  name: string; // e.g., "Vegan", "Organic"
  // Potentially other fields if populated
}

export interface Product {
  id: string; // from _id
  barcode: string; // Changed from number to string to match typical barcode representations
  name: string;
  ingredients: string[];
  pictureUrl: string;
  description?: string; // Kept as optional, as it's in mock but not core schema
  status?: StatusRef | string; // Can be populated object or just an ID
  symptoms?: SymptomRef[] | string[]; // Array of populated objects or IDs
  claims?: ClaimRef[] | string[]; // Array of populated objects or IDs

  // Fields from old Product type that might be part of 'status' object or derived on frontend
  // status_numeric?: 1 | 2 | 3 | 4 | 5; // Example: if status is an object, this could be status.level
  // statusReason?: string; // Example: if status is an object, this could be status.description
}

// For embedding basic product info in other types like Scan or Claim
export interface ProductBasicInfo {
  id: string;
  barcode: string;
  name: string;
  pictureUrl?: string;
}

export interface Claim {
  id: string;
  userId: string; // Could be a User object if backend populates it
  productBarcode: string;
  explanation: string;
  mediaProofUrl?: string;
  status: boolean; // false = open, true = closed (pending review, approved, rejected)
  createdAt: string;
  updatedAt: string;
  product?: ProductBasicInfo; // Optional: if backend populates basic product info
}

export interface Scan {
  _id: string;
  productBarcode: string;
  productName: string;
  productImage?: string;
  scanDate: string; // ISO date string
}

// API Response types for /api/day/
export interface ScanDataFromApi {
  _id: string;
  productBarcode: string;
  date: string; // ISO date string from API
  userId: string;
  // Any other fields returned by the Scan.find query in dayRouter.get
  // For example, if it returns populated product info (though current task maps placeholders):
  // productName?: string;
  // productImage?: string;
}

export interface DayFromApi {
  date: string; // ISO string date for the day itself
  scans: ScanDataFromApi[];
  symptoms: any[]; // Define further if symptoms data structure is known and needed
  userId: string;
}

// --- New Types for Symptom Reporting ---

// Parameters for the createSymptomsApi function in SymptomReportPage.tsx
export interface CreateSymptomsApiParams {
  date: string; // ISO datetime string
  symptomsData: { [symptomName: string]: number }; // e.g., {"Headache": 4, "Nausea": 2}
  selectedScanIds: string[];
  token: string | null;
}

// Actual JSON body sent to POST /api/symptoms/
export interface SymptomPostBody {
  date: string; // ISO datetime string
  symptoms: { [symptomName: string]: number }; // symptomsData nested under 'symptoms' key
}

// --- End New Types for Symptom Reporting ---

export interface UserRecentSymptomSummary {
  name: string;
  count: number;
  averageSeverity?: number;
  maxSeverity?: number;
}

// Payload for creating a new symptom report (OLD - to be removed or refactored)
// export interface SymptomPayloadItem {
//   name: string; // symptomName from UI selection
//   severity: number;
// }

// export interface CreateSymptomsPayload {
//   scanId?: string; // Optional: If the symptoms are linked to a specific scan
//   productBarcode: string; // Always required
//   date: string; // ISO string, when the symptoms were recorded/felt
//   symptoms: SymptomPayloadItem[]; // Array of symptoms being reported
// }

export interface Symptom {
  id: string;
  name: string;
  icon: string;
  severity?: number;
  description?: string;
}

export interface SymptomReport {
  id: string;
  userId: string;
  productId: string;
  symptoms: (Symptom & { severity: number })[];
  reportedAt: string;
  description?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  postText: string;
  mediaUrls?: string[];
  likes: number;
  comments: Comment[];
  shares: number;
  createdAt: string;
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
  replies?: Comment[];
}

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}
