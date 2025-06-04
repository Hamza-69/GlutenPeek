
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Symptom as SymptomType, CreateSymptomsPayload, SymptomPayloadItem, Scan, DayFromApi, ScanDataFromApi } from '../types'; // Use SymptomType alias

// Local state version of Symptom for UI interaction
interface UISymptom {
  id: string; // e.g. 'headache'
  name: string; // e.g. 'Headache'
  severity: number;
  description: string;
}

interface SymptomReportPageProps {
  onBack: () => void;
  // productId and scanId will be read from URL query params
}

const SymptomReportPage: React.FC<SymptomReportPageProps> = ({ onBack }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  // --- Fetch Recent Scans ---
  const fetchRecentScans = async (token: string | null): Promise<Scan[]> => {
    if (!token) {
      // Return an empty array or throw an error, based on how TanStack Query's `enabled` flag is used.
      // If `enabled: !!token` is strictly used, this case might not be hit often during normal operation.
      return [];
    }

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 2); // Fetch last 3 days (endDate, endDate-1, endDate-2)

    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    const response = await fetch(`/api/day/?startdate=${formattedStartDate}&enddate=${formattedEndDate}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch recent daily scans' }));
      throw new Error(errorData.message || 'Failed to fetch recent daily scans');
    }

    const daysData: DayFromApi[] = await response.json();

    let allScans: ScanDataFromApi[] = [];
    daysData.forEach(day => {
      allScans = allScans.concat(day.scans);
    });

    // Sort scans by date in descending order (most recent first)
    allScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Map ALL processed scans from the 3-day period to the frontend Scan[] type
    const frontendScans: Scan[] = allScans.map(apiScan => ({
      _id: apiScan._id,
      productBarcode: apiScan.productBarcode,
      productName: `Product ${apiScan.productBarcode}`, // Placeholder name
      productImage: `https://via.placeholder.com/150/CCCCCC/FFFFFF?Text=Scan`, // Placeholder image
      scanDate: apiScan.date, // This is the scanDate from API
    }));

    return frontendScans;
  };

  const { data: recentScans, isLoading: isLoadingScans, isError: isErrorScans } = useQuery({
    queryKey: ['recentScans'],
    queryFn: () => fetchRecentScans(token),
    enabled: !!token // Only run query if token exists
  });

  useEffect(() => {
    if (recentScans) {
      console.log('Recent Scans:', recentScans);
    }
    if (isLoadingScans) {
      console.log('Loading recent scans...');
    }
    if (isErrorScans) {
      console.error('Error fetching recent scans.');
    }
  }, [recentScans, isLoadingScans, isErrorScans]);

  const queryParams = new URLSearchParams(location.search);
  const productBarcode = queryParams.get('productId'); // This is the barcode
  const scanId = queryParams.get('scanId'); // Optional scanId

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  const initialSymptoms: UISymptom[] = Array.from({ length: 10 }, (_, i) => ({
    id: `symptom_${i + 1}`,
    name: `Symptom ${i + 1}`,
    severity: 0,
    description: '',
  }));
  const [symptoms, setSymptoms] = useState<UISymptom[]>(initialSymptoms);
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);

  const toggleScanSelection = (scanId: string) => {
    setSelectedScanIds(prevSelectedScanIds =>
      prevSelectedScanIds.includes(scanId)
        ? prevSelectedScanIds.filter(id => id !== scanId)
        : [...prevSelectedScanIds, scanId]
    );
  };

  const updateSymptom = (id: string, field: 'severity' | 'description', value: number | string) => {
    setSymptoms(prev => prev.map(symptom => 
      symptom.id === id ? { ...symptom, [field]: value } : symptom
    ));
  };

  // Removed toggleProduct as selectedProducts is removed

  // --- Create Symptoms API Function and Mutation ---
  const createSymptomsApi = async (data: {
    date: string; // ISO datetime string
    symptomsData: { [symptomName: string]: number };
    selectedScanIds: string[];
    token: string | null;
  }): Promise<SymptomType[]> => { // Assuming SymptomType[] is what the backend returns on success
    const { date, symptomsData, selectedScanIds, token: apiToken } = data;

    if (!apiToken) throw new Error("Authentication token not found.");

    let apiUrl = '/api/symptoms/';
    if (selectedScanIds.length > 0) {
      const queryString = selectedScanIds.map((id, index) => `scanId${index}=${encodeURIComponent(id)}`).join('&');
      apiUrl += `?${queryString}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ date, symptoms: symptomsData }), // Nested under "symptoms" key
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to report symptoms' }));
      throw new Error(errorData.message || 'Failed to report symptoms');
    }
    return response.json();
  };

  const { mutate: reportSymptoms, isLoading: isReportingSymptoms } = useMutation(
    createSymptomsApi,
    {
      onSuccess: () => {
        toast({
          title: "Symptoms Reported",
          description: "Your symptoms have been successfully reported.",
        });
        queryClient.invalidateQueries(['recentScans']);
        queryClient.invalidateQueries(['currentUser']);
        // Consider if specific product queries need invalidation based on selectedScanIds if necessary
        // e.g., selectedScanIds.forEach(id => queryClient.invalidateQueries(['scan', id]));
        onBack();
      },
      onError: (error: Error) => {
        toast({
          title: "Error Reporting Symptoms",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const handleSubmit = () => {
    // Check if any scans are selected
    if (selectedScanIds.length === 0) {
      toast({
        title: "No Scans Selected",
        description: "Please select at least one scan to associate with the symptoms.",
        variant: "destructive",
      });
      return;
    }

    // Prepare symptomsObject
    const symptomsObject: { [symptomName: string]: number } = {};
    symptoms.forEach(symptomItem => {
      if (symptomItem.severity > 0) {
        symptomsObject[symptomItem.name] = symptomItem.severity;
      }
    });

    // Rated Symptoms Check
    if (Object.keys(symptomsObject).length === 0) {
      toast({
        title: "No Symptoms Rated",
        description: "Please rate at least one symptom to report.",
        variant: "destructive",
      });
      return;
    }

    const combinedDateTime = `${date}T${time}:00.000Z`;

    // Call reportSymptoms (Mutation)
    reportSymptoms({
      date: combinedDateTime,
      symptomsData: symptomsObject,
      selectedScanIds,
      token // from useAuth()
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity === 0) return 'bg-muted';
    if (severity <= 2) return 'bg-yellow-400';
    if (severity <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // getMoodEmoji function fully deleted.

  return (
    <div className="p-4 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-3">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Report Symptoms</h1>
      </div>

      <div className="space-y-6">
        {/* Scan Carousel Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 text-foreground">Select Scans Related to Symptoms (Optional)</h3>
            {isLoadingScans && <p className="text-center text-muted-foreground">Loading recent scans...</p>}
            {isErrorScans && !isLoadingScans && <p className="text-center text-red-500">Could not load recent scans.</p>}
            {!isLoadingScans && !isErrorScans && recentScans && recentScans.length === 0 && (
              <p className="text-center text-muted-foreground">No recent scans found in the last 3 days.</p>
            )}
            {!isLoadingScans && !isErrorScans && recentScans && recentScans.length > 0 && (
              <Carousel
                className="w-full max-w-md mx-auto"
                opts={{ align: "start", loop: recentScans.length > 3 }} // Enable loop only if more than 3 items
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {recentScans.map((scan) => (
                    <CarouselItem key={scan._id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3">
                      <div className="p-1 h-full"> {/* Added h-full for consistent item height */}
                        <button
                          onClick={() => toggleScanSelection(scan._id)}
                          className={`w-full h-full flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-150 ease-in-out transform hover:scale-105 ${
                            selectedScanIds.includes(scan._id)
                              ? 'border-primary bg-primary/10 shadow-lg'
                              : 'border-border bg-background hover:bg-muted/60'
                          }`}
                        >
                          <img
                            src={scan.productImage || 'https://via.placeholder.com/150/CCCCCC/FFFFFF?Text=No+Image'}
                            alt={scan.productName}
                            className="w-24 h-24 object-cover mb-2 rounded-md shadow-sm flex-shrink-0" // Added flex-shrink-0
                          />
                          <div className="flex flex-col justify-between flex-grow w-full"> {/* Flex container for text */}
                            <span className="text-sm font-medium text-foreground text-center truncate w-full block">{scan.productName}</span>
                            <span className="text-xs text-muted-foreground text-center block">{new Date(scan.scanDate).toLocaleDateString()}</span>
                          </div>
                        </button>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {/* Conditionally render Previous/Next based on actual number of items that can be scrolled */}
                {/* For sm screens (basis-1/3, 3 items visible), show nav if more than 3 items. */}
                {recentScans.length > 3 && <CarouselPrevious className="hidden sm:flex disabled:opacity-50" />}
                {recentScans.length > 3 && <CarouselNext className="hidden sm:flex disabled:opacity-50" />}
              </Carousel>
            )}
          </CardContent>
        </Card>

        {/* Date and Time */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 text-foreground">When did you experience these symptoms?</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div>
                <Label htmlFor="time" className="flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Symptoms */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 text-foreground">What symptoms did you experience?</h3>
            <div className="space-y-4">
              {symptoms.map((symptom) => (
                <div key={symptom.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3"> {/* This div might need adjustment if symptom name is now alone */}
                    {/* Removed emoji span: <span className="text-2xl">{getMoodEmoji(symptom.severity)}</span> */}
                    <span className="font-medium text-foreground text-lg">{symptom.name}</span> {/* Increased text size slightly and ensured it's a block or inline-block if further styling needed */}
                  </div>
                  
                  {/* Severity Scale */}
                  <div className="mb-3">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Severity (1-5)
                    </Label>
                    <div className="flex space-x-2">
                      {Array.from({length: 5}).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => updateSymptom(symptom.id, 'severity', i + 1)}
                          className={`w-8 h-8 rounded transition-colors ${
                            symptom.severity >= i + 1 
                              ? getSeverityColor(i + 1)
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <span className="text-xs font-semibold text-white">
                            {i + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {symptom.severity > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        Description (optional)
                      </Label>
                      <Textarea
                        placeholder="Describe the symptom..."
                        value={symptom.description}
                        onChange={(e) => updateSymptom(symptom.id, 'description', e.target.value)}
                        className="bg-background min-h-[60px]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Selection - This section should be removed or re-evaluated.
            The symptom report is for a specific product identified by productBarcode from URL.
            The carousel allows associating other recent scans with this specific symptom report.
        */}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          className="w-full py-6 gradient-bg text-white text-lg"
          disabled={isReportingSymptoms}
        >
          {isReportingSymptoms ? 'Submitting...' : 'Submit Symptom Report'}
        </Button>
      </div>
    </div>
  );
};

export default SymptomReportPage;
