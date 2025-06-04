import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { User, Post } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, UserPlus, UserMinus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import PostItem from '../components/PostItem';

// Fetches the main user profile data
const fetchUserProfile = async (userId: string): Promise<User> => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('User not found.');
    const errorData = await response.json().catch(() => ({ message: "Error fetching user profile" }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return response.json();
};

// Fetches all posts for a given user (non-paginated, or large limit)
const fetchUserPostsList = async (profileUserId: string): Promise<Post[]> => {
  const limit = 100; // Fetch up to 100 posts
  const response = await fetch(`/api/posts/search?userId=${profileUserId}&q=&limit=${limit}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Error fetching posts for user ${profileUserId}` }));
    throw new Error(errorData.message || `Network response was not ok for user posts`);
  }
  const data = await response.json();
  // API for search returns { posts: [], nextCursor: ...}, so we extract posts
  return data.posts || [];
};

// --- Follow/Unfollow API Functions ---
const followUserApi = async ({ userIdToFollow, token }: { userIdToFollow: string; token: string }): Promise<any> => {
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`/api/users/${userIdToFollow}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to follow user.');
  }
  return response.json();
};

const unfollowUserApi = async ({ userIdToUnfollow, token }: { userIdToUnfollow: string; token: string }): Promise<any> => {
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`/api/users/${userIdToUnfollow}/unfollow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to unfollow user.');
  }
  return response.json();
};

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, token } = useAuth();
  const queryClient = useQueryClient();

  // Query for User Profile Data
  const { data: userProfile, isLoading: isLoadingProfile, isError: isErrorProfile, error: profileError } = useQuery<User, Error>(
    ['userProfile', userId],
    () => fetchUserProfile(userId!),
    {
      enabled: !!userId,
      retry: (failureCount, err) => {
        if (err.message === 'User not found.') return false;
        return failureCount < 3;
      },
    }
  );

  // Query for User's Posts (now uses useQuery, not useInfiniteQuery)
  const {
    data: userPostsData,
    isLoading: isLoadingUserPosts,
    isError: isErrorUserPosts,
    error: userPostsError,
  } = useQuery<Post[], Error>(
    ['userPostsList', userId], // Unique query key for this user's post list
    () => fetchUserPostsList(userId!),
    {
      enabled: !!userId, // Only fetch if userId is available
    }
  );

  // Mutations for Follow/Unfollow
  const { mutate: followUserMutation, isLoading: isFollowingUser } = useMutation(followUserApi, {
    onSuccess: () => {
      toast({ title: "User Followed" });
      queryClient.invalidateQueries(['currentUser']);
      queryClient.invalidateQueries(['userProfile', userId]);
    },
    onError: (err: Error) => toast({ title: "Error Following User", description: err.message, variant: "destructive" }),
  });

  const { mutate: unfollowUserMutation, isLoading: isUnfollowingUser } = useMutation(unfollowUserApi, {
    onSuccess: () => {
      toast({ title: "User Unfollowed" });
      queryClient.invalidateQueries(['currentUser']);
      queryClient.invalidateQueries(['userProfile', userId]);
    },
    onError: (err: Error) => toast({ title: "Error Unfollowing User", description: err.message, variant: "destructive" }),
  });

  const handleFollowToggle = () => {
    if (!currentUser || !token || !userId) {
      toast({ title: "Action not allowed", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const isCurrentlyFollowing = currentUser.following?.includes(userId);
    if (isCurrentlyFollowing) {
      unfollowUserMutation({ userIdToUnfollow: userId, token });
    } else {
      followUserMutation({ userIdToFollow: userId, token });
    }
  };

  if (isLoadingProfile) return <div className="flex justify-center items-center min-h-screen bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (isErrorProfile) return <div className="container mx-auto p-4 text-center py-10"><div className="flex justify-center mb-4"><AlertTriangle className="h-12 w-12 text-destructive" /></div><h1 className="text-xl text-destructive mb-2">Error: {profileError?.message || 'Could not load user profile.'}</h1><Button asChild variant="link"><Link to="/">&larr; Back to Home</Link></Button></div>;
  if (!userProfile) return <div className="container mx-auto p-4 text-center py-10"><h1 className="text-xl text-muted-foreground">User not found.</h1><Button asChild variant="link" className="mt-4"><Link to="/">&larr; Back to Home</Link></Button></div>;

  const userInitial = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : (userProfile.email ? userProfile.email.charAt(0).toUpperCase() : '?');
  const isCurrentlyFollowing = currentUser?.following?.includes(userId!);
  const followMutationInProgress = isFollowingUser || isUnfollowingUser;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 p-6 border-b">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
            <Avatar className="w-28 h-28 sm:w-36 sm:h-36 text-5xl mb-4 sm:mb-0 sm:mr-6 border-2 border-primary shadow-md">
              <AvatarImage src={userProfile.pfp} alt={userProfile.name} />
              <AvatarFallback className="gradient-bg text-white">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-grow mt-2">
              <h1 className="text-3xl font-bold text-foreground">{userProfile.name}</h1>
              <p className="mt-3 text-foreground text-sm leading-relaxed">
                {userProfile.bio || "This user hasn't shared a bio yet."}
              </p>
              <div className="mt-4">
                {currentUser && userId && currentUser.id !== userId && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followMutationInProgress || !currentUser}
                    variant={isCurrentlyFollowing ? "outline" : "default"}
                    className={!isCurrentlyFollowing ? "gradient-bg text-white" : ""}
                  >
                    {(followMutationInProgress) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isCurrentlyFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />)}
                    {isCurrentlyFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Posts by {userProfile.name}</h2>
          {isLoadingUserPosts && (
            <div className="flex justify-center items-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          )}
          {isErrorUserPosts && (
            <p className="text-destructive text-center py-6">Error loading posts: {userPostsError?.message}</p>
          )}
          {!isLoadingUserPosts && !isErrorUserPosts && (!userPostsData || userPostsData.length === 0) && (
            <p className="text-muted-foreground text-center py-6">This user hasn't posted anything yet.</p>
          )}
          <div className="space-y-4 mt-2">
            {userPostsData?.map(post => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
          {/* Infinite scroll elements removed */}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfilePage;
