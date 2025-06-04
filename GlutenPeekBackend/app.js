const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose')
const env = require('./utils/config')
const middleware = require('./utils/middleware')
const { userRouter, getPublicUserProfile } = require('./controllers/users') // Modified import
const loginRouter = require('./controllers/login')
const { productRouter, publicProductRouter } = require('./controllers/products') // Updated import
const scanRouter = require('./controllers/scans')
const { claimsRouter, publicClaimsRouter } = require('./controllers/claims') // Updated import
const dayRouter = require('./controllers/days')
const symptomRouter = require('./controllers/symptoms')
const statusRouter = require('./controllers/status')
const commentRouter = require('./controllers/comment')
const { postsRouter, publicPostsRouter } = require('./controllers/post') // Updated import

const app = express()

const mongoUrl = env.MONGODB_URI
mongoose.set('strictQuery', false)

mongoose.connect(mongoUrl).then(() => {
  console.log('connected to MongoDB')
}).catch((error) => {
  console.error('error connecting to MongoDB:', error.message)
})

morgan.token('body', req => {
  return JSON.stringify(req.body)
})

app.use(morgan(':method :url :status :res[content-length] :response-time ms :body'))
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Welcome to GlutenPeek Api!')
})

// Authenticated user routes should be checked first for specific paths like /me
app.use('/api/users', userRouter) // Authenticated user routes (handles /me, /:id/follow, etc.)
// Public user profile route for specific IDs not caught by userRouter
app.get('/api/users/:id', getPublicUserProfile)

app.use('/api/login', loginRouter)
// Mount public routes BEFORE authentication middleware
app.use('/api/products', publicProductRouter) // Handles GET /:barcode, GET /search
app.use('/api/posts', publicPostsRouter) // Handles GET /, GET /:id, GET /search
app.use('/api/claims', publicClaimsRouter) // Handles GET /search (already done)
app.use('/api/status', statusRouter) // Assuming statusRouter is public or handles its own auth

app.use(middleware.tokenExtractor, middleware.userExtractor)

// Mount authenticated routes AFTER authentication middleware
app.use('/api/products', productRouter) // Handles POST /
app.use('/api/posts', postsRouter) // Handles POST /, POST /:id/like, etc.
app.use('/api/claims', claimsRouter) // This handles authenticated routes like POST /, GET /:id
app.use('/api/scans', scanRouter)
app.use('/api/days', dayRouter)
app.use('/api/symptoms', symptomRouter)
app.use('/api/comments', commentRouter)
app.use(middleware.errorHandler, middleware.unknownEndpoint)

module.exports = app