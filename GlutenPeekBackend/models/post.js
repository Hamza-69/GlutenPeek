const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
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
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
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

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
  justOne: false
})

module.exports = mongoose.model('Post', postSchema)
