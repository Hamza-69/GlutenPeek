import React from 'react';
import { Post } from '../types'; // Adjust path if your types are elsewhere
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle } from 'lucide-react'; // For basic stat display

interface PostItemProps {
  post: Post;
}

const PostItem: React.FC<PostItemProps> = ({ post }) => {
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Post Header */}
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.user?.pfp} />
            <AvatarFallback className="gradient-bg text-white">
              {post.user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-sm">{post.user?.name || 'Unknown User'}</div>
            <div className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</div>
          </div>
        </div>

        {/* Post Content */}
        <p className="text-foreground mb-3 leading-relaxed whitespace-pre-wrap">
          {post.postText}
        </p>

        {/* Post Media (Simplified: shows first image if available) */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mb-3">
            <img
              src={post.mediaUrls[0]}
              alt="Post media"
              className="w-full rounded-lg object-cover max-h-64 border" // Added border
            />
            {post.mediaUrls.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                (+{post.mediaUrls.length - 1} more image{post.mediaUrls.length > 2 ? 's' : ''})
              </p>
            )}
          </div>
        )}

        {/* Post Stats (Read-only) */}
        <div className="flex items-center space-x-4 text-muted-foreground text-sm border-t pt-3">
          <div className="flex items-center">
            <Heart className="w-4 h-4 mr-1" />
            <span>{Array.isArray(post.likes) ? post.likes.length : 0}</span>
          </div>
          <div className="flex items-center">
            <MessageCircle className="w-4 h-4 mr-1" />
            <span>{Array.isArray(post.comments) ? post.comments.length : 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostItem;
