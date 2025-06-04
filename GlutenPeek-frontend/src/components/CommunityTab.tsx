import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Heart, Share, Send, Plus, Search, Loader2 } from 'lucide-react';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import ImageUpload from './ui/image-upload';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

interface ApiPostsResponse {
  posts: Post[];
  nextCursor?: string | null;
}

const CommunityTab: React.FC = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q')?.trim() || '';

  const [localSearchInput, setLocalSearchInput] = useState(searchQuery);
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, string[]>>({});
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);

  // API Fetch Functions
  const fetchFeedPosts = async ({ pageParam = undefined, queryKey }: any): Promise<ApiPostsResponse> => {
    const [_key, _feedIdentifier, authToken] = queryKey;
    let url = '/api/posts';
    if (pageParam) url += `?cursor=${pageParam}`;
    const headers: HeadersInit = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch feed posts' }));
      throw new Error(errorData.message || 'Failed to fetch feed posts');
    }
    return response.json();
  };

  const fetchSearchedPostsByName = async ({ pageParam = undefined, queryKey }: any): Promise<ApiPostsResponse> => {
    const [_key, _searchIdentifier, currentSearchQuery, _authToken] = queryKey; // authToken might not be needed if search is public
    const limit = 10;
    let url = `/api/posts/search?q=${encodeURIComponent(currentSearchQuery)}&limit=${limit}`;
    if (pageParam) url += `&cursor=${pageParam}`;
    // const headers: HeadersInit = {}; // No auth header for public search
    // if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(url /*, { headers } */);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch searched posts' }));
      throw new Error(errorData.message || 'Failed to fetch searched posts');
    }
    return response.json();
  };

  const queryFn = searchQuery
    ? ({ pageParam }: { pageParam?: string }) => fetchSearchedPostsByName({ pageParam, queryKey: ['posts', 'search', searchQuery, token] })
    : ({ pageParam }: { pageParam?: string }) => fetchFeedPosts({ pageParam, queryKey: ['posts', 'feed', token] });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    // refetch // Not explicitly used yet, but good to have if manual refresh needed
  } = useInfiniteQuery<ApiPostsResponse, Error>(
    ['posts', searchQuery || 'feed', token], // Dynamic query key
    queryFn,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      enabled: !!token, // Assuming feed always needs token. Search is public but key includes token for consistency.
    }
  );

  const { ref: infiniteScrollRef, inView: isInfiniteScrollTriggerInView } = useInView();

  useEffect(() => {
    if (isInfiniteScrollTriggerInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isInfiniteScrollTriggerInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap(page => page.posts) || [];

  // Update localSearchInput when URL query changes (e.g., browser back/forward or initial load)
  useEffect(() => {
    setLocalSearchInput(searchQuery);
  }, [searchQuery]);

  const handleLocalSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedSearch = localSearchInput.trim();
    if (trimmedSearch) {
      navigate(`/community?q=${encodeURIComponent(trimmedSearch)}`);
    } else {
      navigate('/community');
    }
  };

  // --- Like/Unlike, Comment, CreatePost mutations (ensure queryClient.invalidateQueries uses the dynamic key) ---
  const dynamicQueryKeyToInvalidate = ['posts', searchQuery || 'feed', token];

  const likePostApi = async ({ postId }: { postId: string }): Promise<Post> => { /* ... existing ... */ if (!token) throw new Error("Auth token not found."); const r = await fetch(`/api/posts/${postId}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); if(!r.ok) throw new Error("Failed to like."); return r.json(); };
  const unlikePostApi = async ({ postId }: { postId: string }): Promise<Post> => { /* ... existing ... */ if (!token) throw new Error("Auth token not found."); const r = await fetch(`/api/posts/${postId}/unlike`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); if(!r.ok) throw new Error("Failed to unlike."); return r.json();};
  const addCommentApi = async (data: {postId: string; postText: string; mediaUrls?: string[]}): Promise<Comment> => { /* ... existing ... */ if(!token) throw new Error("Auth token not found"); const {postId, ...payload}=data; const r = await fetch(`/api/comments/${postId}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)}); if(!r.ok){const ed=await r.json().catch(()=>({})); throw new Error(ed.message||"Failed to comment");} return r.json();};
  const addPostApi = async ({postText, mediaUrls}:{postText:string; mediaUrls?:string[]}): Promise<Post> => { /* ... existing ... */ if(!token) throw new Error("Auth token not found"); const r = await fetch('/api/posts/',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({postText,mediaUrls})}); if(!r.ok){const ed=await r.json().catch(()=>({})); throw new Error(ed.message||"Failed to post");} return r.json();};

  const { mutate: likePostMutation, isLoading: isLikingPost } = useMutation(likePostApi, {
    onSuccess: () => queryClient.invalidateQueries(dynamicQueryKeyToInvalidate),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const { mutate: unlikePostMutation, isLoading: isUnlikingPost } = useMutation(unlikePostApi, {
    onSuccess: () => queryClient.invalidateQueries(dynamicQueryKeyToInvalidate),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const { mutate: addComment, isLoading: isAddingComment } = useMutation(addCommentApi, {
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries(dynamicQueryKeyToInvalidate);
      toast({ title: "Comment Posted!" });
      setCommentText(prev => ({ ...prev, [vars.postId]: '' }));
      setCommentImages(prev => ({ ...prev, [vars.postId]: [] }));
    },
    onError: (e: Error) => toast({ title: "Error Posting Comment", description: e.message, variant: "destructive" }),
  });
  const { mutate: createPost, isLoading: isCreatingPost } = useMutation(addPostApi, {
    onSuccess: () => {
      queryClient.invalidateQueries(dynamicQueryKeyToInvalidate);
      toast({ title: "Post Created!" });
      setNewPostContent(''); setNewPostImages([]); setShowNewPost(false);
    },
    onError: (e: Error) => toast({ title: "Error Creating Post", description: e.message, variant: "destructive" }),
  });

  // Event Handlers (handleLike, toggleComments, handleComment, handleNewPost are mostly the same, ensure they use correct states)
  const handleLike = (post: Post) => { /* ... uses likePostMutation / unlikePostMutation ... */ if(!user||!token)return; const liked=post.likes.some(l=>(typeof l==='string'?l:l.id)===user.id); if(liked)unlikePostMutation({postId:post.id});else likePostMutation({postId:post.id}); };
  const toggleComments = (postId: string) => { /* ... same ... */ setShowComments(p=>{const n=new Set(p); if(n.has(postId))n.delete(postId);else n.add(postId); return n;}); };
  const handleComment = (postId: string) => { /* ... uses addComment ... */ if(!user||!token)return;const text=commentText[postId]?.trim();const urls=commentImages[postId]||[];if(!text&&urls.length===0)return;addComment({postId,postText:text||'',mediaUrls:urls}); };
  const handleNewPost = () => { /* ... uses createPost ... */ if(!newPostContent.trim()&&newPostImages.length===0)return;createPost({postText:newPostContent,mediaUrls:newPostImages}); };
  const formatTimeAgo = (ds: string) => { /* ... same ... */ if(!ds)return '';const d=new Date(ds);const n=new Date();const df=Math.floor((n.getTime()-d.getTime())/(36e5));if(df<1)return 'Just now';if(df<24)return `${df}h ago`;return `${Math.floor(df/24)}d ago`;};


  if (isLoading && !data) {
    return (
      <div className="p-4 space-y-4">
        <Card><CardContent className="p-4"><div className="h-10 bg-muted rounded animate-pulse"></div></CardContent></Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="flex space-x-3 mb-3"><div className="w-10 h-10 bg-gray-200 rounded-full" /><div className="space-y-2 flex-1"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-1/4" /></div></div><div className="space-y-2"><div className="h-4 bg-gray-200 rounded" /><div className="h-4 bg-gray-200 rounded w-3/4" /></div></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-3">
          {searchQuery ? `Results for "${searchQuery}"` : "Community Feed"}
        </h1>
        <form onSubmit={handleLocalSearchSubmit} className="flex gap-2 items-center">
          <Input
            type="search"
            placeholder="Search posts in community..."
            value={localSearchInput}
            onChange={(e) => setLocalSearchInput(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" aria-label="Search"><Search className="w-5 h-5" /></Button>
          {searchQuery && (
             <Button variant="outline" onClick={() => { setLocalSearchInput(''); navigate('/community'); }}>Clear Search</Button>
          )}
        </form>
      </div>

      {isError && (
        <Card>
          <CardContent className="p-4 text-red-500 text-center">
            <p>Error: {error?.message || "Could not load posts."}</p>
            {/* <Button onClick={() => refetch()} className="mt-2">Try Again</Button> */}
          </CardContent>
        </Card>
      )}

      {!searchQuery && ( // Only show "create new post" button when not in search mode
        <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <Button onClick={() => setShowNewPost(!showNewPost)} variant="ghost" className="w-full justify-start text-muted-foreground" disabled={!user}>
              <Plus className="w-4 h-4 mr-2" /> What's on your mind, {user?.name}?
            </Button>
          </CardContent>
        </Card>
      )}

      {showNewPost && user && !searchQuery && (
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-3 mb-3">
              <Avatar className="w-10 h-10"><AvatarImage src={user.pfp} /><AvatarFallback className="gradient-bg text-white">{user?.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
              <div className="flex-1"><div className="font-semibold text-sm">{user?.name}</div><div className="text-xs text-muted-foreground">Share with community</div></div>
            </div>
            <Textarea placeholder="Share your thoughts, experiences, or questions..." value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="mb-3 min-h-[100px]" />
            <div className="mb-3">
              <ImageUpload images={newPostImages} onImagesChange={setNewPostImages} maxImages={5} pathPrefix="posts/" buttonText="Add Images to Post" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setShowNewPost(false); setNewPostContent(''); setNewPostImages([]); }} disabled={isCreatingPost}>Cancel</Button>
              <Button onClick={handleNewPost} disabled={(!newPostContent.trim() && newPostImages.length === 0) || isCreatingPost} className="gradient-bg text-white">{isCreatingPost ? 'Posting...' : 'Post'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && allPosts.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No posts found {searchQuery ? `for "${searchQuery}"` : 'in the community feed. Be the first to post!'}.
          </CardContent>
        </Card>
      )}

      {allPosts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="w-10 h-10"><AvatarImage src={post.user.pfp} /><AvatarFallback className="gradient-bg text-white">{post.user.name.charAt(0)}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-semibold text-sm">{post.user.name}</div>
                <div className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</div>
              </div>
            </div>
            <p className="text-foreground mb-3 leading-relaxed whitespace-pre-wrap">{post.postText}</p>
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {post.mediaUrls.slice(0, 4).map((image, index) => (
                  <div key={index} className="relative aspect-square"> {/* Ensure aspect ratio for consistency */}
                    <img src={image} alt={`Post media ${index + 1}`} className="w-full h-full rounded-lg object-cover" />
                    {index === 3 && post.mediaUrls!.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold">+{post.mediaUrls!.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center space-x-6 text-muted-foreground border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => handleLike(post)} disabled={isLikingPost || isUnlikingPost} className={`p-0 h-auto font-normal hover:text-red-500 ${user && post.likes.some((l:string|{id:string})=>typeof l==='string'?l===user.id:l.id===user.id) ? 'text-red-500':'text-muted-foreground'}`}>
                <Heart className={`w-4 h-4 mr-1 ${user && post.likes.some((l:string|{id:string})=>typeof l==='string'?l===user.id:l.id===user.id) ? 'fill-current':''}`} />
                {Array.isArray(post.likes) ? post.likes.length : 0}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggleComments(post.id)} className="p-0 h-auto font-normal text-muted-foreground hover:text-blue-500">
                <MessageCircle className="w-4 h-4 mr-1" /> {Array.isArray(post.comments) ? post.comments.length : 0}
              </Button>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-normal text-muted-foreground hover:text-green-500"><Share className="w-4 h-4 mr-1" />{post.shares || 0}</Button>
            </div>
            {showComments.has(post.id) && (
              <div className="mt-4 border-t pt-4 space-y-3">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={comment.user.pfp} /><AvatarFallback className="gradient-bg text-white text-xs">{comment.user.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg px-3 py-2"><div className="font-semibold text-sm">{comment.user.name}</div><div className="text-sm">{comment.content}</div></div>
                        <div className="text-xs text-muted-foreground mt-1">{formatTimeAgo(comment.createdAt)}</div>
                      </div>
                    </div>
                  ))
                ) : <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>}
                {user && (
                  <div className="space-y-2">
                    <div className="flex space-x-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={user?.pfp} /><AvatarFallback className="gradient-bg text-white text-xs">{user?.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                      <div className="flex-1 flex space-x-2">
                        <Input placeholder="Write a comment..." value={commentText[post.id] || ''} onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyPress={(e) => e.key==='Enter' && !isAddingComment && handleComment(post.id)} className="flex-1" disabled={isAddingComment} />
                        <Button onClick={() => handleComment(post.id)} disabled={isAddingComment || (!commentText[post.id]?.trim() && (!commentImages[post.id] || commentImages[post.id].length === 0))} size="sm" className="gradient-bg text-white">
                          {isAddingComment ? <Send className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="ml-11">
                      <ImageUpload images={commentImages[post.id] || []} onImagesChange={(urls) => setCommentImages(prev => ({ ...prev, [post.id]: urls }))} maxImages={5} pathPrefix="comments/" buttonText="Add Images to Comment" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {(hasNextPage || isFetchingNextPage) && (
        <div ref={infiniteScrollRef} className="h-10 mt-4 flex justify-center items-center">
          {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>
      )}
      {!hasNextPage && !isLoading && !isFetchingNextPage && allPosts.length > 0 && (
         <p className="text-sm text-muted-foreground text-center mt-4">No more posts to load.</p>
      )}
    </div>
  );
};

export default CommunityTab;
