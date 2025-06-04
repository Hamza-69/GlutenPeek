
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, PackageSearch } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Scan, Product, StatusRef } from '../types'; // Import global Scan and Product type

// Props interface remains the same
interface RecentScansPageProps {
  onBack: () => void;
  onProductClick: (productBarcode: string) => void;
  onReportSymptoms: (productBarcode: string, scanId: string) => void; // Updated prop
}

const fetchRecentScans = async (token: string): Promise<Scan[]> => {
  const response = await fetch('/api/scans', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch recent scans and could not parse error response' }));
    throw new Error(errorData.message || 'Failed to fetch recent scans');
  }
  return response.json();
};


const RecentScansPage: React.FC<RecentScansPageProps> = ({ 
  onBack, 
  onProductClick, 
  onReportSymptoms 
}) => {
  const { token } = useAuth();
  const { data: scans = [], isLoading, error } = useQuery<Scan[], Error>(
    ['recentScans'],
    () => fetchRecentScans(token!),
    {
      enabled: !!token,
    }
  );

  // Re-using getStatusInfo logic from ProductPage, adapted slightly for product.status
  const getStatusDisplayInfo = (status?: StatusRef | string | number) => {
    let statusLevel: number | undefined;
    let statusLabel: string = 'Unknown Status';
    let statusDescriptionText: string | undefined = 'No detailed reason provided.';

    if (typeof status === 'object' && status !== null && 'level' in status) { // StatusRef
      statusLevel = (status as StatusRef).level;
      statusLabel = (status as StatusRef).name || statusLabel;
      statusDescriptionText = (status as StatusRef).description || statusDescriptionText;
    } else if (typeof status === 'number') { // Direct numeric status
      statusLevel = status;
      if (status >= 4) statusLabel = 'Gluten-Free';
      else if (status === 3) statusLabel = 'May Contain Gluten';
      else statusLabel = 'Contains Gluten';
      // No specific description for raw number status unless we map it
    }
    // If status is a string ID, we can't infer much without fetching its details.

    let icon = <AlertTriangle className="w-5 h-5 text-gray-500" />;
    let color = 'text-gray-500';

    if (statusLevel !== undefined) {
      if (statusLevel >= 4) {
        icon = <CheckCircle className="w-5 h-5 text-green-500" />;
        color = 'text-green-500';
      } else if (statusLevel === 3) {
        icon = <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        color = 'text-yellow-500';
      } else {
        icon = <XCircle className="w-5 h-5 text-red-500" />;
        color = 'text-red-500';
      }
    }

    return { icon, label: statusLabel, color, description: statusDescriptionText };
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSymptomEmoji = (symptom: string) => {
    // This function can be kept if reportedSymptoms are strings.
    // If they become objects, it might need adjustment.
    const symptomsMap: Record<string, string> = {
      headache: '🤕',
      nausea: '🤢',
      bloating: '🤰',
      fatigue: '😴',
      rash: '🔴',
      pain: '😣'
    };
    return symptomsMap[symptom.toLowerCase()] || '😷';
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-background min-h-screen">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Recent Scans</h1>
        </div>
        <div className="space-y-4">
          {Array.from({length: 3}).map((_, i) => ( // Reduced skeleton items for brevity
            <Card key={i} className="bg-card animate-pulse">
              <CardContent className="p-4 flex space-x-4">
                <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-background min-h-screen">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Recent Scans</h1>
        </div>
        <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <PackageSearch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Scans</h3>
              <p className="text-muted-foreground">{error.message}</p>
            </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <div className="p-4 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-3">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Recent Scans</h1>
      </div>

      {/* Scans List */}
      {scans.length === 0 && !isLoading && (
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <PackageSearch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Scans Yet</h3>
            <p className="text-muted-foreground">You haven't scanned any products. Start scanning to see them here!</p>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {scans.map((scan) => {
          const productStatusInfo = getStatusDisplayInfo(scan.product?.status);
          return (
            <Card
              key={scan.id}
              className="bg-card border-border cursor-pointer hover:bg-accent transition-colors"
              // Ensure product and product.barcode exist before calling onProductClick
              onClick={() => scan.product && scan.product.barcode ? onProductClick(scan.product.barcode) : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    {scan.product?.pictureUrl ? (
                      <img src={scan.product.pictureUrl} alt={scan.product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {scan.product?.name || 'Unknown Product'}
                      </h3>
                      {productStatusInfo.icon}
                    </div>

                    <p className="text-sm text-muted-foreground mb-1">
                      Scanned: {formatDate(scan.scannedAt)}
                    </p>

                    <p className={`text-sm font-medium mb-2 ${productStatusInfo.color}`}>
                      {productStatusInfo.label}: {productStatusInfo.description}
                    </p>

                    {/* Symptoms */}
                    {scan.reportedSymptoms && scan.reportedSymptoms.length > 0 && (
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-sm text-muted-foreground">Symptoms ({scan.reportedSymptoms.length}):</span>
                        <div className="flex space-x-1">
                          {scan.reportedSymptoms.slice(0, 5).map((symptom, index) => ( // Show max 5 symptoms
                            <span key={index} className="text-lg" title={symptom}>
                              {getSymptomEmoji(symptom)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Report Symptoms Button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent Card's onClick from firing
                        if (scan.product && scan.product.barcode) {
                          onReportSymptoms(scan.product.barcode, scan.id); // Pass both productBarcode and scanId
                        } else {
                          // Handle case where product or barcode might be missing, though unlikely if scan exists
                          toast({ title: "Error", description: "Product details missing for this scan.", variant: "destructive" });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="gradient-gold-bg text-black border-0 hover:opacity-80"
                    >
                      Report Symptoms
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More - Placeholder for pagination */}
      {scans.length > 0 && (
        <div className="mt-6 text-center">
          <Button variant="outline" className="border-border text-foreground" onClick={() => alert('Pagination not yet implemented.')}>
            Load More Scans
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecentScansPage;
