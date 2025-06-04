const mongoose = require('mongoose')

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  productBarcode: {
    type: Number,
    ref: 'Product',
    required: true
  },
  symptoms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Symptom'
    }
  ]
}, {
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id.toString()
      delete ret._id
      delete ret.__v
      return ret
    }
  }
})


module.exports = mongoose.model('Scan', scanSchema)
