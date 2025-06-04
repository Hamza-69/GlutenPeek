const mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postText: {
    type: String,
    required: true,
    trim: true
  },
  mediaUrls: {
    type: [String],
    validate: {
      validator: function (val) {
        return val.length <= 5
      },
      message: 'You can provide at most 5 media URLs.'
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id.toString() // Add this line
      delete ret._id
      delete ret.__v
      return ret
    }
  },
  toObject: { virtuals: true }
})

module.exports = mongoose.model('Comment', CommentSchema)
