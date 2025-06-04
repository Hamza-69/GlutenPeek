const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: 3,
    },
    bio: {
      type: String,
      default: 'Hi There! I am a new user!',
    },
    pfp: {
      type: String,
      default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    },
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,:\s@']+(\.[^<>()[\]\\.,:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please fill a valid email address.',
      ],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    settings: {
      theme: { type: Boolean, default: false },
      telegram_notifications: { type: Boolean, default: false },
      telegram_number: { type: String },
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.passwordHash
      },
    },
    toObject: { virtuals: true },
  }
)

userSchema.virtual('scans', {
  ref: 'Scan',
  localField: '_id',
  foreignField: 'userId',
  justOne: false,
})

userSchema.virtual('symptoms', {
  ref: 'Symptom',
  localField: '_id',
  foreignField: 'userId',
  justOne: false,
})

module.exports = mongoose.model('User', userSchema)
