
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Share, RotateCcw, Copy, MessageSquare, Info, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '../hooks/useIsMobile';

const ChatbotTab: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m your gluten-free research assistant. I can help you understand ingredients, find safe alternatives, analyze products, and answer questions about gluten-free living. How can I help you today?',
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(inputValue),
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('pizza') || lowerInput.includes('restaurant')) {
      return 'Based on Reddit community experiences:\n\nSeveral highly recommended gluten-free pizza options have been reported by the community in Italy. Sprouts supermarket chain carries a variety of gluten-free pizza products [2]. Major chains like Domino\'s and Pizza Hut offer gluten-free crusts, though cross-contamination awareness is important [3].\n\n📍 Reddit Sources:\n• [1] Experience with GF pizza in Italy\n• [2] Sprouts GF pizza options review\n• [3] Chain restaurants GF pizza guide';
    }
    
    if (lowerInput.includes('ingredient') || lowerInput.includes('what is')) {
      return 'I can help you understand ingredients! Many processed foods contain additives and preservatives that may pose concerns for sensitive individuals. Would you like me to explain any specific ingredients you\'ve found in your scanned products?\n\nCommon ingredients to watch for:\n• Modified food starch\n• Natural flavors\n• Caramel color\n• Malt extract';
    }
    
    if (lowerInput.includes('healthy') || lowerInput.includes('alternative')) {
      return 'Great question about healthy alternatives! Based on your scan history, I notice you\'ve been looking at snack foods. Consider options with:\n\n✅ Fewer than 5 ingredients\n✅ No artificial colors\n✅ Minimal added sugars\n✅ Certified gluten-free labels\n\nNuts, seeds, and dried fruits make excellent alternatives!';
    }
    
    if (lowerInput.includes('symptom') || lowerInput.includes('reaction')) {
      return 'I understand you\'re concerned about food reactions. Common triggers include:\n\n⚠️ Artificial colors and dyes\n⚠️ High fructose corn syrup\n⚠️ Certain preservatives (BHT, BHA)\n⚠️ Cross-contamination sources\n\nHave you noticed any patterns between specific products and your symptoms? I can help you track potential triggers.';
    }
    
    return 'That\'s an interesting question! I\'m here to help you make informed food choices. Based on your scanned products, I can provide personalized recommendations. Feel free to ask about:\n\n🔍 Specific ingredients\n📊 Nutritional content\n🔄 Healthier alternatives\n📱 Product scanning tips\n\nWhat would you like to explore?';
  };

  const handleClearChat = () => {
    setMessages([messages[0]]);
    toast({
      title: "Chat Cleared",
      description: "Conversation history has been cleared.",
    });
  };

  const handleCopyResponse = () => {
    const lastAIMessage = messages.filter(m => !m.isUser).pop();
    if (lastAIMessage) {
      navigator.clipboard.writeText(lastAIMessage.content);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard.",
      });
    }
  };

  const handleShareToCommunity = () => {
    const lastAIMessage = messages.filter(m => !m.isUser).pop();
    if (lastAIMessage) {
      toast({
        title: "Shared to Community!",
        description: "Your conversation has been posted to the community feed.",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const InfoSidebar = () => (
    <div className="w-80 border-l border-border bg-accent/30 p-4 space-y-4 flex-shrink-0">
      <div>
        <h3 className="font-semibold text-foreground mb-2">Features</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Real community experiences</li>
          <li>• Direct links to Reddit sources</li>
          <li>• Voice Input (Coming Soon)</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-2">Tips</h3>
        <p className="text-sm text-muted-foreground">
          Be specific in your questions for better results. Look for [1], [2], etc. to match with Reddit sources below each answer.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-2">Disclaimer</h3>
        <p className="text-sm text-muted-foreground">
          Always consult healthcare professionals for medical advice. Information provided is from community experiences only.
        </p>
      </div>
    </div>
  );

  const InfoModal = () => (
    showMobileInfo && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg p-6 w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat Info</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileInfo(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-2">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Real community experiences</li>
              <li>• Direct links to Reddit sources</li>
              <li>• Voice Input (Coming Soon)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">Tips</h3>
            <p className="text-sm text-muted-foreground">
              Be specific in your questions for better results. Look for [1], [2], etc. to match with Reddit sources below each answer.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">Disclaimer</h3>
            <p className="text-sm text-muted-foreground">
              Always consult healthcare professionals for medical advice. Information provided is from community experiences only.
            </p>
          </div>
        </div>
      </div>
    )
  );

  if (isMobile) {
    return (
      <>
        {/* Container that works with mobile navigation */}
        <div className="h-full flex flex-col bg-background">
          {/* Header - Fixed */}
          <div className="bg-card border-b border-border p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">GlutenPeek's Research Engine</h1>
                  <p className="text-sm text-muted-foreground">Reddit-Powered Search</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileInfo(true)}
              >
                <Info className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area - Scrollable with space for mobile nav */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0" style={{paddingBottom: '5rem'}}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${
                  message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {message.isUser ? (
                      <AvatarFallback className="gradient-bg text-white text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-card border border-border text-sm">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.isUser 
                      ? 'gradient-bg text-white' 
                      : 'bg-card border border-border text-foreground'
                  }`}>
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 ${
                      message.isUser ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-card border border-border text-sm">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed Input Area - Sticky at bottom */}
          <div className="border-t border-border bg-background p-4 flex-shrink-0">
            <div className="flex justify-center space-x-2 mb-4">
              <Button 
                onClick={handleClearChat}
                variant="outline"
                size="sm"
                className="gradient-bg text-white border-0"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button 
                onClick={handleCopyResponse}
                variant="outline"
                size="sm"
                className="gradient-gold-bg text-black border-0"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button 
                onClick={handleShareToCommunity}
                variant="outline"
                size="sm"
                className="border-border text-foreground"
              >
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>

            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about gluten-free topics..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-background border-border"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="gradient-bg text-white px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <InfoModal />
      </>
    );
  }

  // Desktop view that takes full available height
  return (
    <div className="h-full flex flex-col bg-background max-h-screen">
      {/* Header - Fixed */}
      <div className="bg-card border-b border-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">GlutenPeek's Research Engine</h1>
              <p className="text-sm text-muted-foreground">Reddit-Powered Search</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Flex container with remaining height */}
      <div className="flex flex-1 min-h-0">
        {/* Chat Area - Uses remaining height with scrollable messages */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages - Scrollable area within available space */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${
                  message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {message.isUser ? (
                      <AvatarFallback className="gradient-bg text-white text-sm">
                        {user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-card border border-border text-sm">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.isUser 
                      ? 'gradient-bg text-white' 
                      : 'bg-card border border-border text-foreground'
                  }`}>
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 ${
                      message.isUser ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-card border border-border text-sm">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action Buttons and Input - Fixed at bottom */}
          <div className="border-t border-border p-4 flex-shrink-0">
            <div className="flex justify-center space-x-2 mb-4">
              <Button 
                onClick={handleClearChat}
                variant="outline"
                size="sm"
                className="gradient-bg text-white border-0"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear Chat
              </Button>
              <Button 
                onClick={handleCopyResponse}
                variant="outline"
                size="sm"
                className="gradient-gold-bg text-black border-0"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Response
              </Button>
              <Button 
                onClick={handleShareToCommunity}
                variant="outline"
                size="sm"
                className="border-border text-foreground"
              >
                <Share className="w-4 h-4 mr-1" />
                Share to Community
              </Button>
            </div>

            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about gluten-free topics..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-background border-border"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="gradient-bg text-white px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - Fixed width */}
        <InfoSidebar />
      </div>
    </div>
  );
};

export default ChatbotTab;
