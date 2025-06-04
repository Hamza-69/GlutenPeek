const loginRouter = require('express').Router()
const bcrypt = require('bcrypt')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const { calculateStreak } = require('../utils/streakCalculator') // Import calculateStreak

loginRouter.post('/', async (request, response, next) => {
  try {
    const { email, password } = request.body
    const user = await User.findOne({ email })

    const passwordCorrect = user === null
      ? false
      : await bcrypt.compare(password, user.passwordHash)

    if (!(user && passwordCorrect)) { // Simplified condition
      return response.status(401).json({ // Changed to 401 for unauthorized
        error: 'Invalid username or password.'
      })
    }
    const userForToken = {
      email: user.email,
      id: user._id,
    }
    const token = jwt.sign(
      userForToken,
      process.env.SECRET,
      { expiresIn: '168h' } // Added expiration
    )
    // Prepare user object for response (excluding passwordHash, etc.)
    const userObject = user.toJSON() // user.toJSON() is defined in User model

    // Calculate streak
    const streak = await calculateStreak(user._id)
    userObject.streak = streak // Add streak to the user object

    response
      .status(200)
      .send({ token, user: userObject }) // Send token and the modified user object
  } catch (error) {
    next(error)
  }
})

module.exports = loginRouter