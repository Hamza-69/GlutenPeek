const commentRouter = require('express').Router()
const Comment = require('../models/comment')
const Post = require('../models/post')

commentRouter.post('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized: User not available' })
    }

    const postExists = await Post.findById(req.params.id)
    if (!postExists) {
      return res.status(404).json({ error: 'Post not found. Cannot create comment.' })
    }

    const { postText, mediaUrls } = req.body // Destructure after user check
    const comment = new Comment({
      userId: req.user._id,
      postText,
      mediaUrls,
      postId: req.params.id
    })
    const savedComment = await comment.save()
    res.status(201).json(savedComment)
  } catch (error) {
    next(error)
  }
})

module.exports = commentRouter