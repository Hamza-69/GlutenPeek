
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Symptom {
  id: string;
  name: string;
  emoji: string;
  description: string;
  count: number;
}

interface AllSymptomsPageProps {
  onBack: () => void;
  productId: string;
}

const AllSymptomsPage: React.FC<AllSymptomsPageProps> = ({ onBack, productId }) => {
  // Mock symptoms data - in a real app, this would come from an API
  const symptoms: Symptom[] = [
    {
      id: '1',
      name: 'Headache',
      emoji: '🤕',
      description: 'Persistent head pain reported after consuming this product',
      count: 12
    },
    {
      id: '2',
      name: 'Nausea',
      emoji: '🤢',
      description: 'Feeling of sickness and urge to vomit',
      count: 8
    },
    {
      id: '3',
      name: 'Bloating',
      emoji: '🤰',
      description: 'Abdominal swelling and discomfort',
      count: 15
    },
    {
      id: '4',
      name: 'Fatigue',
      emoji: '😴',
      description: 'Extreme tiredness and lack of energy',
      count: 6
    },
    {
      id: '5',
      name: 'Skin Rash',
      emoji: '🔴',
      description: 'Red, itchy patches appearing on skin',
      count: 4
    },
    {
      id: '6',
      name: 'Stomach Pain',
      emoji: '😣',
      description: 'Sharp or dull pain in the stomach area',
      count: 9
    },
    {
      id: '7',
      name: 'Diarrhea',
      emoji: '💩',
      description: 'Loose, watery bowel movements',
      count: 7
    },
    {
      id: '8',
      name: 'Joint Pain',
      emoji: '🦴',
      description: 'Aching or stiffness in joints',
      count: 3
    }
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center p-4 bg-card border-b border-border">
        <Button variant="ghost" onClick={onBack} className="mr-3">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">All Reported Symptoms</h1>
      </div>

      <div className="p-4 pb-20">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Symptoms reported by the community for this product
          </p>
        </div>

        {/* Symptoms List */}
        <div className="space-y-3">
          {symptoms.map((symptom) => (
            <Card key={symptom.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl flex-shrink-0">
                    {symptom.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">
                        {symptom.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-muted-foreground">Reported</span>
                        <span className="font-bold text-primary">{symptom.count}</span>
                        <span className="text-sm text-muted-foreground">times</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {symptom.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="mt-6 bg-accent/30 border-primary/20">
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-2">
                Total Reports: {symptoms.reduce((sum, s) => sum + s.count, 0)}
              </h3>
              <p className="text-sm text-muted-foreground">
                Data collected from community symptom reports
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AllSymptomsPage;
