const mongoose = require('mongoose')

const symptomSchema = new mongoose.Schema({
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
  scanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan',
    required: true
  },
  symptoms: {
    type: Map,
    of: Number,
    required: true,
    validate: {
      validator: function(symptomsMap) {
        if (!symptomsMap || symptomsMap.size === 0) {
          return false; // Should not be empty if required is true, but good to double check
        }
        for (const severity of symptomsMap.values()) {
          if (typeof severity !== 'number' || severity < 1 || severity > 5) {
            return false;
          }
        }
        return true;
      },
      message: 'Symptoms must be a map with keys as symptom names and values as numbers between 1 and 5.'
    }
  }
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


module.exports = mongoose.model('Symptom', symptomSchema)
