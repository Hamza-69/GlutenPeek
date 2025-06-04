const jwt = require('jsonwebtoken')
const User = require('../models/user')

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
    return response.status(400).json({ error: 'expected `email` to be unique' })
  } else if (error.name ===  'JsonWebTokenError') {
    return response.status(400).json({ error: 'token missing or invalid' })
  }

  // Log unhandled errors before any further action
  console.error('Unhandled error in errorHandler:', error)

  // Pass to default error handler
  next(error)
}

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '')
  }
  next()
}

const userExtractor = async (request, response, next) => {
  if (!request.token) {
    return response.status(401).json({ error: 'Authentication token missing' })
  }

  try {
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    request.user = await User.findById(decodedToken.id)
    if (!request.user) {
      return response.status(401).json({ error: 'User not found for token' })
    }
    next()
  } catch (error) {
    // If jwt.verify fails, or any other error occurs, pass it to the error handler
    next(error)
  }
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

module.exports = {
  tokenExtractor,
  userExtractor,
  unknownEndpoint,
  errorHandler
}