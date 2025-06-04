import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserRecentSymptomSummary } from '../types';
import SymptomDisplayBadge from './ui/SymptomDisplayBadge'; // Import the new component
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WelcomeTabProps {
  onNavigateToRecentScans: () => void;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({ onNavigateToRecentScans }) => {
  const { user, token } = useAuth(); // Added token
  const navigate = useNavigate();

  // --- Fetch/Mock User Recent Symptoms ---
  const fetchUserRecentSymptoms = async (authToken: string | null): Promise<UserRecentSymptomSummary[]> => {
    // TODO: Replace with actual API call when available.
    // For now, return mock data. AuthToken is passed for future use.
    console.log('fetchUserRecentSymptoms called with token:', authToken ? 'present' : 'absent');
    const mockUserSymptomsData: UserRecentSymptomSummary[] = [
      { name: 'Symptom 1', count: 3, averageSeverity: 4.2 },
      { name: 'Symptom 3', count: 1, averageSeverity: 2.0 },
      { name: 'Symptom 5', count: 5, averageSeverity: 3.5, maxSeverity: 5 },
      { name: 'Bloating', count: 2, averageSeverity: 2.8 }, // Example with more data
      { name: 'Fatigue', count: 4, maxSeverity: 3 }, // Example with only maxSeverity
      { name: 'Itching', count: 1 }, // Example with no severity
    ];
    return Promise.resolve(mockUserSymptomsData);
  };

  const {
    data: userRecentSymptoms,
    isLoading: isLoadingSymptoms,
    isError: isErrorSymptoms
  } = useQuery<UserRecentSymptomSummary[], Error>(
    ['userRecentSymptoms'],
    () => fetchUserRecentSymptoms(token),
    { enabled: !!token } // Enable if token is necessary for the actual API call
  );

  // Local getSeverityBadgeColorClass is now removed. Centralized version will be used by SymptomDisplayBadge.


  const mockScans = [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop',
      title: 'Organic Granola',
      status: 5,
      date: '2024-01-15'
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1571119081773-7e5ac0099a63?w=100&h=100&fit=crop',
      title: 'Protein Bar',
      status: 3,
      date: '2024-01-14'
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100&h=100&fit=crop',
      title: 'Green Tea',
      status: 5,
      date: '2024-01-13'
    }
  ];

  const mockSymptoms = [
    { icon: '😴', name: 'Fatigue', count: 2 }, // This is the old mockSymptoms, will be removed
    { icon: '🤕', name: 'Headache', count: 1 },
    { icon: '😰', name: 'Nausea', count: 1 }
  ];

  const getStatusColor = (status: number) => {
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-blue-500',
      5: 'bg-green-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const [showDoctorReport, setShowDoctorReport] = React.useState(false);
  const [showTravelCard, setShowTravelCard] = React.useState(false);
  const [reportStartDate, setReportStartDate] = React.useState('');
  const [reportEndDate, setReportEndDate] = React.useState('');
  const [selectedLanguage, setSelectedLanguage] = React.useState('');

  const recentScans = [
    {
      id: '1',
      name: 'Organic Granola',
      status: 5,
      date: '2024-01-15'
    },
    {
      id: '2',
      name: 'Protein Bar',
      status: 3,
      date: '2024-01-14'
    },
    {
      id: '3',
      name: 'Green Tea',
      status: 5,
      date: '2024-01-13'
    }
  ];

  // const recentSymptoms = [ // This is the old recentSymptoms, will be replaced by userRecentSymptoms from useQuery
  //   { icon: '😴', name: 'Fatigue', count: 2 },
  //   { icon: '🤕', name: 'Headache', count: 1 },
  //   { icon: '😰', name: 'Nausea', count: 1 }
  // ];

  const handleGenerateReport = () => {
    // Implement report generation logic here
  };

  const handleGenerateTravelCard = () => {
    // Implement travel card generation logic here
  };

  return (
    <div className="p-2 sm:p-4 space-y-4 sm:space-y-6 bg-background min-h-screen max-w-full overflow-x-hidden">
      {/* Welcome Header */}
      <div className="text-center py-4 sm:py-6">
        <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4">
          <AvatarImage src={user?.profilePicture} />
          <AvatarFallback className="gradient-bg text-white text-xl sm:text-2xl">
            {user?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl sm:text-2xl font-bold gradient-text">Hi, {user?.name?.split(' ')[0] || 'User'}!</h1>
        <p className="text-sm sm:text-base text-readable-muted">Welcome back</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-card border-border text-center">
          <CardContent className="p-2 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-primary">12</div>
            <div className="text-xs text-readable-muted">Scans Today</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-center">
          <CardContent className="p-2 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold gradient-gold">3</div>
            <div className="text-xs text-readable-muted">Symptoms</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-center">
          <CardContent className="p-2 sm:p-4">
            <div className="text-lg sm:text-2xl font-bold text-primary flex items-center justify-center">
              🔥 {user?.streak || 7}
            </div>
            <div className="text-xs text-readable-muted">Day Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans Carousel */}
      <Card className="bg-card border-border">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-readable">Recent Scans</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs sm:text-sm text-primary hover:bg-primary/10 px-2 sm:px-3"
              onClick={onNavigateToRecentScans}
            >
              View All
            </Button>
          </div>
          <Carousel className="w-full">
            <CarouselContent className="-ml-1">
              {recentScans.map((scan, index) => (
                <CarouselItem key={index} className="pl-1 basis-1/3">
                  <Card 
                    className="bg-background border-border cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/product/${scan.id}`)}
                  >
                    <CardContent className="p-2 sm:p-3">
                      <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                        <span className="text-xl sm:text-2xl">📦</span>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-readable truncate">{scan.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                          scan.status === 5 ? 'bg-green-500' : 
                          scan.status === 3 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div className="text-xs text-readable-muted">{scan.date}</div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </CardContent>
      </Card>

      {/* Recent Symptoms */}
      <Card className="bg-card border-border">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-readable">Recent Symptoms</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs sm:text-sm text-primary hover:bg-primary/10 px-2 sm:px-3"
              onClick={onNavigateToRecentScans}
            >
              View All
            </Button>
          </div>
          <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-2"> {/* Added pb-2 for scrollbar clearance */}
            {isLoadingSymptoms && <p className="text-xs text-readable-muted">Loading symptoms...</p>}
            {isErrorSymptoms && <p className="text-xs text-red-500">Error loading symptoms.</p>}
            {!isLoadingSymptoms && !isErrorSymptoms && (!userRecentSymptoms || userRecentSymptoms.length === 0) && (
              <p className="text-xs text-readable-muted">No recent symptoms reported.</p>
            )}
            {!isLoadingSymptoms && !isErrorSymptoms && userRecentSymptoms && userRecentSymptoms.length > 0 && (
              userRecentSymptoms.map((symptom) => {
                const severity = symptom.averageSeverity ?? symptom.maxSeverity;
                return (
                  <SymptomDisplayBadge
                    key={symptom.name} // Assuming name is unique enough for key in this mock list
                    name={symptom.name}
                    count={symptom.count}
                    severity={severity}
                  />
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={() => setShowDoctorReport(true)}
          className="w-full py-4 sm:py-6 gradient-bg text-white text-sm sm:text-lg"
        >
          📋 Generate Doctor Report
        </Button>
        
        <Button 
          onClick={() => setShowTravelCard(true)}
          variant="outline" 
          className="w-full py-4 sm:py-6 border-border text-readable text-sm sm:text-lg hover:bg-accent"
        >
          🌍 Create Travel Card
        </Button>
      </div>

      {/* Doctor Report Modal */}
      {showDoctorReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm sm:max-w-md bg-card mx-4">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-readable">Generate Doctor Report</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="start-date" className="text-sm text-readable">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="bg-background text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm text-readable">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="bg-background text-sm"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleGenerateReport}
                    className="flex-1 gradient-bg text-white text-sm"
                  >
                    Generate PDF
                  </Button>
                  <Button 
                    onClick={() => setShowDoctorReport(false)}
                    variant="outline"
                    className="flex-1 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Travel Card Modal */}
      {showTravelCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm sm:max-w-md bg-card mx-4">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-readable">Create Travel Card</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="language" className="text-sm text-readable">Language</Label>
                  <select 
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background text-readable text-sm"
                  >
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                    <option value="italian">Italian</option>
                    <option value="german">German</option>
                    <option value="portuguese">Portuguese</option>
                    <option value="japanese">Japanese</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleGenerateTravelCard}
                    className="flex-1 gradient-bg text-white text-sm"
                  >
                    Generate Card
                  </Button>
                  <Button 
                    onClick={() => setShowTravelCard(false)}
                    variant="outline"
                    className="flex-1 text-sm"
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

export default WelcomeTab;
