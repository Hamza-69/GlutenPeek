
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    try {
      await register(name, email, password);
      toast({
        title: "Account created!",
        description: "Welcome to GlutenPeek! Start your gluten-free journey today.",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Something went wrong. Please try again.",
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
          <CardTitle className="text-2xl text-emerald-700 font-bold">Join GlutenPeek</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>
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
                placeholder="Create a password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-emerald-600 hover:underline text-sm"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
