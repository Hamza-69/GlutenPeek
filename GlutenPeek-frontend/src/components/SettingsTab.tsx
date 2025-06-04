
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '../types'; // Import User type for API response

// Define the shape of data for profile update API
interface UserProfileUpdateData {
  name?: string;
  email?: string;
  bio?: string;
  password?: string; // This would be the newPassword
  currentPassword?: string; // Required if password is being changed
  pfp?: string;
}

// Define the shape of data for user settings update API
interface UserSettingsUpdateData {
  theme?: boolean;
  telegram_notifications?: boolean;
  telegram_number?: string;
}

const SettingsTab: React.FC = () => {
  const { user, token, setUser: setAuthUser } = useAuth(); // Get token and setUser for optimistic update
  const { isDarkMode, toggleDarkMode } = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPfpS3Url, setNewPfpS3Url] = useState<string | null>(null); // State for the new PFP URL

  // For theme, telegram_notifications, and telegram_number, directly use user.settings if available
  // The actual update logic is for Phase 2, so for now, these Switches might be read-only
  // or their onCheckedChange would update local state not yet persisted.
  // For controlled components, ensure they have a state or are readOnly if not editable.
  const [uiThemeIsDark, setUiThemeIsDark] = useState(user?.settings?.theme ?? isDarkMode);
  const [telegramNotifications, setTelegramNotifications] = useState(user?.settings?.telegram_notifications || false);
  const [telegramNumber, setTelegramNumber] = useState(user?.settings?.telegram_number || '');

  // Local state for push notifications, as it's not in User schema
  const [pushNotifications, setPushNotifications] = useState(true);


  // Update local state when user object changes (e.g., after initial fetch)
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setBio(user.bio || ''); // Default to empty string if bio is null
      setUiThemeIsDark(user.settings?.theme ?? isDarkMode);
      setTelegramNotifications(user.settings?.telegram_notifications || false);
      setTelegramNumber(user.settings?.telegram_number || '');
      // setNewPfpS3Url(null); // Reset new PFP URL if user context changes (e.g. logout/login)
                               // This might be too aggressive if user just updates profile and user object is refetched.
                               // Better to reset it specifically after successful upload.
    }
  }, [user, isDarkMode]);


  // --- API Function and Mutation for User Settings Update ---
  const updateUserSettingsApi = async (
    { settingsData }: { settingsData: UserSettingsUpdateData }
  ): Promise<User> => {
    if (!token) throw new Error("Authentication token not found.");
    const response = await fetch('/api/users/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settingsData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update settings' }));
      throw new Error(errorData.message || 'Failed to update settings');
    }
    return response.json();
  };

  const { mutate: updateUserSettings, isLoading: isUpdatingSettings } = useMutation(
    updateUserSettingsApi,
    {
      onSuccess: (updatedUser) => {
        toast({
          title: "Settings Updated",
          description: "Your settings have been successfully updated.",
        });
        queryClient.invalidateQueries(['currentUser']);
        setAuthUser(updatedUser); // Optimistically update user in AuthContext
        queryClient.setQueryData(['currentUser', token], updatedUser); // And in react-query cache
      },
      onError: (error: Error) => {
        toast({
          title: "Error Updating Settings",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        // Optionally, refetch user to revert optimistic updates if any were done before error
        // queryClient.invalidateQueries(['currentUser']);
      },
    }
  );

  // --- API Function and Mutation for Profile Update ---
  const updateUserProfileApi = async (
    { profileData }: { profileData: UserProfileUpdateData }
  ): Promise<User> => {
    if (!token) throw new Error("Authentication token not found.");

    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
      throw new Error(errorData.message || 'Failed to update profile');
    }
    return response.json();
  };

  const { mutate: updateUserProfile, isLoading: isUpdatingProfile } = useMutation(
    updateUserProfileApi,
    {
      onSuccess: (updatedUser) => {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        queryClient.invalidateQueries(['currentUser']);
        // Optimistically update the user in AuthContext and react-query cache
        setAuthUser(updatedUser);
        queryClient.setQueryData(['currentUser', token], updatedUser);

        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (profileData.pfp) { // If pfp was part of the update
          setNewPfpS3Url(null); // Reset the newPfpS3Url state
        }
      },
      onError: (error: Error) => {
        toast({
          title: "Error Updating Profile",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const changes: UserProfileUpdateData = {};

    if (name !== user.name) changes.name = name;
    if (email !== user.email) changes.email = email;
    if (bio !== user.bio) changes.bio = bio;

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast({ title: "Password Mismatch", description: "New password and confirm password do not match.", variant: "destructive" });
        return;
      }
      if (!currentPassword) {
        toast({ title: "Current Password Required", description: "Please enter your current password to set a new one.", variant: "destructive" });
        return;
      }
      changes.password = newPassword;
      changes.currentPassword = currentPassword;
    }

    if (Object.keys(changes).length === 0) {
      toast({ title: "No Changes", description: "No changes detected to update." });
      return;
    }


    if (newPfpS3Url && newPfpS3Url !== user.pfp) {
      changes.pfp = newPfpS3Url;
    }

    // Check if there are any actual changes (including pfp)
    if (Object.keys(changes).length === 0) {
      toast({ title: "No Changes", description: "No changes detected to update." });
      return;
    }

    updateUserProfile({ profileData: changes });
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <div className="p-4 space-y-6 bg-background min-h-full">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <Avatar className="w-16 h-16">
                {/* Display newPfpS3Url if available (optimistic preview after ImageUpload gives it), else user.pfp */}
                <AvatarImage src={newPfpS3Url || user?.pfp} />
                <AvatarFallback className="gradient-bg text-white text-xl">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Replace Button with ImageUpload component */}
              <div className="flex-grow">
                <ImageUpload
                  images={user?.pfp ? [user.pfp] : []} // Initial image is current user PFP
                  onImagesChange={(urls) => setNewPfpS3Url(urls[0] || null)}
                  maxImages={1}
                  pathPrefix="pfp/"
                  buttonText="Upload New Picture"
                />
                 {newPfpS3Url && <p className="text-xs text-muted-foreground mt-1">New picture selected. Save profile to apply.</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (required for password change)"
              />
            </div>
            
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (leave blank to keep current)"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            
            <Button type="submit" className="w-full gradient-bg text-white" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-notifications" className="text-sm font-medium">
                Push Notifications (App)
              </Label>
              <p className="text-xs text-gray-500">Receive general app notifications</p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushNotifications} // Local state, not from user.settings
              onCheckedChange={setPushNotifications} // Updates local state
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="telegram-notifications" className="text-sm font-medium">
                Telegram Notifications
              </Label>
              <p className="text-xs text-gray-500">Get updates via Telegram</p>
            </div>
            <Switch
              id="telegram-notifications"
              checked={telegramNotifications}
              onCheckedChange={(checked) => {
                setTelegramNotifications(checked);
                if (user && user.settings.telegram_notifications !== checked) {
                  updateUserSettings({ settingsData: { telegram_notifications: checked } });
                }
              }}
              disabled={isUpdatingSettings}
            />
          </div>
          
          {telegramNotifications && (
            <div className="relative"> {/* Added relative for potential save button positioning */}
              <Label htmlFor="telegramNumber">Telegram Phone Number</Label>
              <Input
                id="telegramNumber"
                type="tel"
                value={telegramNumber}
                onChange={(e) => setTelegramNumber(e.target.value)}
                onBlur={() => {
                  if (user && user.settings.telegram_number !== telegramNumber.trim()) {
                    updateUserSettings({ settingsData: { telegram_number: telegramNumber.trim() } });
                  }
                }}
                placeholder="Enter your Telegram phone number"
                disabled={isUpdatingSettings}
              />
              {/* Example of a small save button, can be styled better */}
              {/* <Button size="sm" onClick={handleSaveTelegramNumber} className="absolute right-1 top-1/2 transform -translate-y-1/2">Save</Button> */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-xl">{isDarkMode ? '🌙' : '☀️'}</div>
              <div>
                <Label htmlFor="dark-mode" className="text-sm font-medium">
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Label>
                <p className="text-xs text-gray-500">
                  Your saved preference: {user?.settings?.theme ? 'Dark' : 'Light'}. Current: {isDarkMode ? 'Dark' : 'Light'}.
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode"
              checked={isDarkMode}
              onCheckedChange={(checked) => {
                toggleDarkMode(); // Update ThemeContext immediately for UI responsiveness
                if (user && user.settings.theme !== checked) {
                  updateUserSettings({ settingsData: { theme: checked } });
                }
              }}
              disabled={isUpdatingSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button 
        onClick={handleLogout}
        variant="destructive" 
        className="w-full"
      >
        Logout
      </Button>
    </div>
  );
};

export default SettingsTab;
