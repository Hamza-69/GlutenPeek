
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNavigate, useLocation, Routes, Route, useParams } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Header from '../components/Header';
import MobileNavigation from '../components/MobileNavigation';
import DesktopSidebar from '../components/DesktopSidebar';
import WelcomeTab from '../components/WelcomeTab';
import CommunityTab from '../components/CommunityTab';
import ScanTab from '../components/ScanTab';
import RecentScansPage from '../components/RecentScansPage';
import SymptomReportPage from '../components/SymptomReportPage';
import ProductPage from '../components/ProductPage';
import AllSymptomsPage from '../components/AllSymptomsPage';
import SettingsTab from '../components/SettingsTab';
import ChatbotTab from '../components/ChatbotTab';
// import CommunitySearchPage from './CommunitySearchPage'; // Removed import
import ProductSearchPage from './ProductSearchPage';
import UserSearchPage from './UserSearchPage';
import ClaimSearchPage from './ClaimSearchPage';
import UserProfilePage from './UserProfilePage';
import NotFound from './NotFound';

const Index = () => {
  const { user, isLoading, token } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('welcome');
  
  // Add detailed logging to diagnose rendering issues
  console.log("Index component rendering with:", {
    user,
    isLoading,
    hasToken: !!token,
    locationPathname: location.pathname
  });

  // When loading, show a loading indicator
  if (isLoading) {
    console.log("Index: Rendering loading state");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full gradient-bg mx-auto mb-4 flex items-center justify-center animate-pulse">
            <div className="w-12 h-12 bg-white rounded text-primary flex items-center justify-center font-bold text-xl">
              GP
            </div>
          </div>
          <h2 className="text-xl font-semibold text-primary">Loading GlutenPeek...</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {token ? "Retrieving your account..." : "Preparing application..."}
          </p>
        </div>
      </div>
    );
  }

  // If we have a token but no user, try to get from localStorage
  if (token && !user) {
    const storedUser = localStorage.getItem('user');
    console.log("Index: Token exists but no user. localStorage user:", storedUser ? "exists" : "not found");
    
    // Special debugging message only in development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md p-4 bg-red-50 rounded-lg">
            <h2 className="text-xl font-semibold text-red-700 mb-2">Authentication Issue</h2>
            <p className="text-sm text-red-700 mb-4">
              You have a token but no user data. This is likely an issue with the API or data loading.
            </p>
            <button 
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reset Authentication
            </button>
          </div>
        </div>
      );
    }
  }

  // If no user, show login or register page
  if (!user) {
    console.log("Index: No user, showing auth mode:", authMode);
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    );
  }
  
  // If we reach here, we have a user, so render the main app
  console.log("Index: User authenticated, rendering main app");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  const handleNavigateToRecentScans = () => {
    navigate('/recent-scans');
  };

  // Updated to handle both productId (barcode) and optional scanId
  const handleNavigateToSymptomReport = (productIdOrBarcode: string, scanId?: string) => {
    const params = new URLSearchParams();
    params.append('productId', productIdOrBarcode); // productId is the barcode
    if (scanId) {
      params.append('scanId', scanId);
    }
    navigate(`/symptom-report?${params.toString()}`);
  };

  const handleNavigateToProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleNavigateToAllSymptoms = (productId: string) => {
    navigate(`/all-symptoms/${productId}`);
  };

  const handleBackToMain = () => {
    navigate('/welcome');
    setActiveTab('welcome');
  };

  // Check if we're on the chatbot page
  const isChatbotPage = location.pathname === '/chatbot';
  
  return (
    <div className={`bg-background flex flex-col ${
      isChatbotPage ? 'h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      <Header />
      
      <div className={`flex flex-1 ${
        isChatbotPage ? 'min-h-0' : 'overflow-hidden'
      }`}>
        {!isMobile && (
          <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        )}
        
        <main className={`flex-1 bg-background ${
          isChatbotPage ? 'min-h-0' : ''
        } ${
          isMobile ? (isChatbotPage ? 'mobile-content chatbot-content' : 'mobile-content') : 'with-sidebar'
        }`}>
          <Routes>
            <Route path="/*" element={<NotFound />} />
            <Route path="/" element={<WelcomeTab onNavigateToRecentScans={handleNavigateToRecentScans} />} />
            <Route path="/welcome" element={<WelcomeTab onNavigateToRecentScans={handleNavigateToRecentScans} />} />
            <Route path="/community" element={<CommunityTab />} />
            <Route path="/scan" element={<ScanTab />} />
            <Route path="/settings" element={<SettingsTab />} />
            <Route path="/chatbot" element={<ChatbotTab />} />
            {/* <Route path="/community/search" element={<CommunitySearchPage />} /> */} {/* Removed route */}
            <Route path="/products/search" element={<ProductSearchPage />} />
            <Route path="/users/search" element={<UserSearchPage />} />
            <Route path="/claims/search" element={<ClaimSearchPage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route 
              path="/recent-scans" 
              element={
                <RecentScansPage
                  onBack={handleBackToMain}
                  onProductClick={handleNavigateToProduct}
                  // RecentScansPage now calls onReportSymptoms with (productBarcode, scanId)
                  // This maps directly to handleNavigateToSymptomReport(productBarcode, scanId)
                  onReportSymptoms={handleNavigateToSymptomReport}
                />
              } 
            />
            <Route 
              path="/symptom-report" 
              element={
                <SymptomReportPage
                  onBack={handleBackToMain}
                  // productId and scanId will be read from query params within SymptomReportPage
                />
              } 
            />
            <Route 
              path="/product/:productId" 
              element={
                <ProductPage
                  onBack={handleBackToMain}
                  onReportSymptoms={(productBarcode) => handleNavigateToSymptomReport(productBarcode, undefined)} // Pass barcode, no scanId
                  onViewAllSymptoms={handleNavigateToAllSymptoms}
                />
              } 
            />
            <Route 
              path="/all-symptoms/:productId" 
              element={<AllSymptomsPageWrapper onBack={handleBackToMain} />} 
            />
          </Routes>
        </main>
      </div>
      
      {isMobile && (
        <MobileNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
};

// Wrapper component to extract the productId from URL parameters
const AllSymptomsPageWrapper = ({ onBack }) => {
  const { productId } = useParams();
  return <AllSymptomsPage onBack={onBack} productId={productId || ''} />;
};

export default Index;
