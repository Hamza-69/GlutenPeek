const mongoose = require('mongoose')

const claimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productBarcode: {
    type: Number,
    ref: 'Product',
    required: true
  },
  explanation: {
    type: String,
    required: true,
    trim: true
  },
  mediaProofUrl: {
    type: String,
    trim: true
  },
  status: {
    type: Boolean,
    default: false // false means "not closed", true means "closed"
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

module.exports = mongoose.model('Claim', claimSchema)
