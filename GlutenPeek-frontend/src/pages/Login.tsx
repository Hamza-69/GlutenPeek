import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Login failed",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Login: Attempting login with email:", email);
    
    try {
      await login(email, password);
      console.log("Login: Login successful");
      
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in to GlutenPeek.",
      });
      
      // Add a small delay before reloading the page if needed
      // This ensures localStorage has time to update
      setTimeout(() => {
        if (!document.location.pathname.includes('/welcome')) {
          console.log("Login: Redirecting to welcome page");
          window.location.href = '/welcome';
        }
      }, 100);
    } catch (error) {
      console.error("Login: Login failed", error);
      
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-white rounded text-emerald-600 flex items-center justify-center font-bold text-xl">
              GP
            </div>
          </div>
          <CardTitle className="text-2xl text-emerald-700 font-bold">GlutenPeek</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-emerald-600 hover:underline text-sm"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
