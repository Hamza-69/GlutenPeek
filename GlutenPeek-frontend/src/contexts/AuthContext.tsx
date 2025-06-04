
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '../types'; // Ensure User type includes all new fields
import { authApi } from '../lib/api'; // Import the auth API service
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean; // This will represent initial token check + user fetch status
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const fetchCurrentUser = async (token: string): Promise<User> => {
  const response = await authApi.getCurrentUser(token);
  
  if (response.error) {
    if (response.status === 401) {
      throw new Error('Unauthorized: Token is invalid or expired.');
    }
    throw new Error(response.error || 'Failed to fetch user data');
  }
  
  return response.data;
};

// Helper functions for localStorage
const saveUserToLocalStorage = (user: User | null) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

const getUserFromLocalStorage = (): User | null => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;
  
  try {
    return JSON.parse(storedUser) as User;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    localStorage.removeItem('user'); // Clear invalid data
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize user from localStorage for immediate UI rendering
  const [user, setUser] = useState<User | null>(getUserFromLocalStorage());
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('authToken'));
  const [isInitialLoading, setIsInitialLoading] = useState(!!token && !user); // Only loading if we have token but no user
  const queryClient = useQueryClient();

  // Custom setter for user that also updates localStorage
  const setUserWithStorage = (newUser: User | null) => {
    setUser(newUser);
    saveUserToLocalStorage(newUser);
  };

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('authToken', newToken);
    } else {
      localStorage.removeItem('authToken');
    }
  };

  const handleLogout = useCallback(() => {
    setUserWithStorage(null); // Use custom setter to also clear localStorage
    setToken(null);
    queryClient.removeQueries(['currentUser']); // Clear current user data from cache
    // Clear any other related queries
    queryClient.clear(); // Optionally clear all queries to start fresh
  }, [queryClient]);

  const { data: fetchedUser, isLoading: isUserFetching, error: userError, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser', token],
    queryFn: () => {
      console.log("Fetching current user with token:", token);
      return fetchCurrentUser(token as string);
    },
    enabled: !!token, // Only run if token exists
    retry: 1, // Retry once on failure
    onSuccess: (data) => {
      console.log("User data fetched successfully:", data);
      // Check if data has the expected structure
      if (data) {
        // Use custom setter to update both state and localStorage
        setUserWithStorage(data);
      } else {
        console.error("User data format unexpected:", data);
        // If we have no data but we had a user in localStorage, keep using that
        const storedUser = getUserFromLocalStorage();
        if (!storedUser) {
          // If no stored user either, log a warning
          console.warn("No user data available from API or localStorage");
        }
      }
    },
    onError: (err) => {
      console.error("Error fetching current user:", err.message);
      if (err.message.includes('Unauthorized')) {
        handleLogout(); // Token is invalid, logout user
      }
      // setUser(null) is handled by handleLogout if unauthorized
    },
    onSettled: () => {
      console.log("User fetch settled, setting isInitialLoading to false");
      setIsInitialLoading(false); // Finished initial load attempt
    },
    staleTime: 1000 * 60 * 1, // 1 minute - reduce for development
    cacheTime: 1000 * 60 * 5, // 5 minutes - reduce for development
    refetchOnWindowFocus: false, // Prevent unwanted refetches
  });

  useEffect(() => {
    // This effect handles the initial loading state
    if (!token) {
      // No token = not logged in, so not loading
      console.log("AuthContext: No token, setting isInitialLoading to false");
      setIsInitialLoading(false);
    } else if (user) {
      // Have token and user data, so not loading
      console.log("AuthContext: Have token and user, setting isInitialLoading to false");
      setIsInitialLoading(false);
    } else {
      // Have token but no user, try to use localStorage data
      const storedUser = getUserFromLocalStorage();
      if (storedUser) {
        console.log("AuthContext: Using user from localStorage");
        setUser(storedUser);
        setIsInitialLoading(false);
      } else {
        console.log("AuthContext: Waiting for user data to load");
        // Add a timeout to prevent indefinite loading if the API call fails
        const timeout = setTimeout(() => {
          console.log("AuthContext: Loading timeout reached, setting isInitialLoading to false");
          setIsInitialLoading(false);
        }, 5000); // 5 second timeout
        
        return () => clearTimeout(timeout);
      }
    }
  }, [token, user]);


  const login = async (email: string, password: string) => {
    setIsInitialLoading(true); // Indicate loading during login process
    try {
      // Log the login attempt
      console.log("Attempting login for:", email);
      
      const response = await authApi.login(email, password);
      console.log("Login response:", response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data?.token) {
        throw new Error('Login failed: No token received');
      }
      
      // Store token in state and localStorage
      setToken(response.data.token);
      
      // If user data is already returned in the login response, set it directly
      if (response.data.user) {
        console.log("Setting user directly from login response:", response.data.user);
        setUserWithStorage(response.data.user); // Use custom setter to update localStorage too
      }
      
      // Force a refetch of the user data to ensure we have the latest
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      // Set loading to false immediately if we already have user data
      if (response.data.user) {
        setIsInitialLoading(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
      handleLogout(); // Ensure cleanup on login failure
      setIsInitialLoading(false);
      
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive"
      });
      
      throw error; // Re-throw to be caught by UI
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsInitialLoading(true);
    try {
      // Log the registration attempt
      console.log("Attempting registration for:", name, email);
      
      const response = await authApi.register(name, email, password);
      console.log("Registration response:", response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data?.token) {
        throw new Error('Registration failed: No token received');
      }
      
      // Store token in state and localStorage
      setToken(response.data.token);
      
      // If user data is already returned in the register response, set it directly
      if (response.data.user) {
        console.log("Setting user directly from registration response:", response.data.user);
        setUserWithStorage(response.data.user); // Use custom setter to update localStorage too
      }
      
      // Force a refetch of the user data to ensure we have the latest
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created!",
      });
      
      // Set loading to false immediately if we already have user data
      if (response.data.user) {
        setIsInitialLoading(false);
      }
    } catch (error) {
      console.error("Registration failed:", error);
      handleLogout();
      setIsInitialLoading(false);
      
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An error occurred during registration",
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Expose refetchUser for manual refresh if needed elsewhere
  // const refreshUser = () => {
  //   if (token) refetchUser();
  // };

  // Prioritize query data, but fall back to localStorage if query hasn't completed
  const currentUser = fetchedUser || user;
  
  // Debug output with more detail
  console.log("AuthContext state:", { 
    currentUser, 
    user, // User from state (initially from localStorage)
    fetchedUser, // User from query
    token,
    isInitialLoading,
    isUserFetching,
    isLoading: isInitialLoading || (!!token && isUserFetching),
    hasError: !!userError,
    localStorageUser: getUserFromLocalStorage() // What's currently in localStorage
  });
  
  // If query finished successfully but returned no data, check if we should use localStorage data
  useEffect(() => {
    if (!isUserFetching && !fetchedUser && token) {
      const storedUser = getUserFromLocalStorage();
      if (storedUser && !user) {
        console.log("Using user data from localStorage as fallback");
        setUser(storedUser);
      }
    }
  }, [isUserFetching, fetchedUser, token, user]);
  
  // If we have a token but user data is missing, log a more specific warning
  if (token && !currentUser) {
    console.warn("Token exists but user data is missing. This may indicate an issue with user data fetching.");
  }
  
  // Add a debug function that can be called to manually refetch user data
  const debugRefreshUser = useCallback(() => {
    if (token) {
      console.log("Manual user refetch triggered");
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      refetchUser();
    } else {
      console.warn("Cannot refresh user: No token available");
    }
  }, [token, refetchUser, queryClient]);
  
  return (
    <AuthContext.Provider value={{ 
      user: currentUser, 
      token, 
      login, 
      register, 
      logout: handleLogout, 
      isLoading: isInitialLoading || (!!token && isUserFetching) 
    }}>
      {/* Render additional debugging info during development */}
      {process.env.NODE_ENV === 'development' && !currentUser && token && (
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          right: 0, 
          background: 'rgba(255,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          zIndex: 9999,
          fontSize: '12px'
        }}>
          Auth Debug: Token exists but user is null. 
          <button 
            onClick={debugRefreshUser}
            style={{ marginLeft: '10px', background: 'white', color: 'black', padding: '2px 5px' }}
          >
            Refresh User
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};
