const mongoose = require('mongoose')

const statusSchema = new mongoose.Schema({
  productBarcode: {
    type: Number,
    ref: 'Product', // Still useful for virtual population if barcode is unique in Product
    required: true
  },
  status: {
    type: Number,
    enum: [1, 2, 3, 4, 5], // allowed statuses
    required: true
  },
  explanation: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
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

module.exports = mongoose.model('Status', statusSchema)
