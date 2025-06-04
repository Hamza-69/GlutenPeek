const postsRouter = require('express').Router() // For authenticated routes
const publicPostsRouter = require('express').Router() // For public routes
const Post = require('./../models/post')

// Get posts with cursor-based pagination (feed) - moved to publicPostsRouter
publicPostsRouter.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const cursor = req.query.cursor

    const query = {}
    if (cursor) {
      query._id = { $lt: cursor }
    }

    // Fetch one extra post to determine if there's a next page
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('userId', 'name pfp') // Populate user details for each post

    let nextCursor = null
    if (posts.length > limit) {
      nextCursor = posts[limit -1]._id // The ID of the last item in the current page
      posts.pop() // Remove the extra post used for determining nextCursor
    }

    // Ensure ids are transformed for posts as well
    const transformedPosts = posts.map(post => post.toJSON())

    res.status(200).json({ posts: transformedPosts, nextCursor })
  } catch (error) {
    next(error)
  }
})

// Search posts with pagination - moved to publicPostsRouter
publicPostsRouter.get('/search', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const cursor = req.query.cursor
    const searchQuery = req.query.q

    const queryCriteria = {}
    if (searchQuery) {
      queryCriteria.postText = { $regex: searchQuery, $options: 'i' }
    }

    // Sort by createdAt descending (latest first), then by _id descending as a tie-breaker
    const sortCriteria = { createdAt: -1, _id: -1 }

    if (cursor) {
      const cursorPost = await Post.findById(cursor)
      if (!cursorPost) {
        return res.status(400).json({ error: 'Invalid cursor' })
      }
      queryCriteria.$or = [
        { createdAt: { $lt: cursorPost.createdAt } },
        { createdAt: cursorPost.createdAt, _id: { $lt: cursorPost._id } }
      ]
    }

    const posts = await Post.find(queryCriteria)
      .sort(sortCriteria)
      .limit(limit + 1)
      .populate('userId', 'name pfp') // Populate user details

    let nextCursor = null
    if (posts.length > limit) {
      nextCursor = posts[limit - 1]._id.toString()
      posts.pop() // Remove the extra item used for determining nextCursor
    }

    const transformedPosts = posts.map(post => post.toJSON())
    res.status(200).json({ posts: transformedPosts, nextCursor })
  } catch (error) {
    next(error)
  }
})

// Get single post by ID - moved to publicPostsRouter
publicPostsRouter.get('/:id', async (req, res, next) => {
  try {
    const post = await Post.find({ userId: req.params.id }).populate('comments')
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    res.status(200).json(post)
  } catch (error) {
    next(error)
  }
})

// Like a post
postsRouter.post('/:id/like', async (request, response, next) => {
  try {
    if (!request.user || !request.user._id) {
      return response.status(401).json({ error: 'Unauthorized: User not available' })
    }
    const postId = request.params.id
    const userId = request.user._id

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ error: 'Post not found.' })
    }

    // Add userId to likes if not already present
    if (!post.likes.includes(userId)) {
      post.likes.push(userId)
      await post.save()
    }
    // Populate user details for likes before sending response
    const populatedPost = await Post.findById(postId).populate('likes', 'name pfp')
    response.status(200).json({ message: 'Post liked successfully.', post: populatedPost })
  } catch (error) {
    next(error)
  }
})

// Unlike a post
postsRouter.post('/:id/unlike', async (request, response, next) => {
  try {
    if (!request.user || !request.user._id) {
      return response.status(401).json({ error: 'Unauthorized: User not available' })
    }
    const postId = request.params.id
    const userId = request.user._id

    const post = await Post.findById(postId)

    if (!post) {
      return response.status(404).json({ error: 'Post not found.' })
    }

    // Remove userId from likes
    const initialLikeCount = post.likes.length
    post.likes = post.likes.filter(likeId => likeId.toString() !== userId.toString())

    if (post.likes.length < initialLikeCount) { // only save if a like was actually removed
      await post.save()
    }

    // Populate user details for likes before sending response
    const populatedPost = await Post.findById(postId).populate('likes', 'name pfp')
    response.status(200).json({ message: 'Post unliked successfully.', post: populatedPost })
  } catch (error) {
    next(error)
  }
})

postsRouter.post('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized: User not available' })
    }
    const { postText, mediaUrls } = req.body // Destructure after user check
    const post = new Post({
      userId: req.user._id,
      postText,
      mediaUrls
    })
    const savedPost = await post.save()
    // Ensure the created post is also transformed before sending
    res.status(201).json(savedPost.toJSON())
  } catch (error) {
    next(error)
  }
})

// Authenticated routes (POST /, POST /:id/like, POST /:id/unlike) remain on postsRouter
// These already have user checks and will be further protected by middleware in app.js

module.exports = { postsRouter, publicPostsRouter }