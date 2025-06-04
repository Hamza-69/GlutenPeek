const productRouter = require('express').Router() // For authenticated routes
const publicProductRouter = require('express').Router() // For public routes
const Product = require('./../models/product')

// POST / remains on productRouter (intended for authentication)
productRouter.post('/', async (request, response, next) => {
  // It's assumed that authentication middleware (tokenExtractor, userExtractor)
  // will be applied to productRouter in app.js, so request.user should be available.
  // If not, this route would need its own explicit auth middleware.
  // For now, proceeding with the assumption it's handled in app.js for this router.
  if (!request.user) { // Added check for clarity, though app.js should handle this
    return response.status(401).json({ error: 'Authentication required to create a product.' });
  }
  try {
    const { name, ingredients, pictureUrl, barcode } = request.body
    const product = new Product({
      barcode,
      name,
      ingredients,
      pictureUrl
    })
    const savedProduct = await product.save()
    response.status(201).json(savedProduct)
  } catch (error) {
    next(error)
  }
})

// GET /:barcode moves to publicProductRouter
publicProductRouter.get('/:barcode', async (request, response, next) => {
  try {
    const barcode = parseInt(request.params.barcode, 10)
    if (isNaN(barcode)) {
      return response.status(400).json({ error: 'Invalid barcode format. Barcode must be a number.' })
    }
    // Changed to findOne, and ensure product is an object or null, not an array
    const product = await Product.findOne({ barcode }).populate([{ path: 'symptoms' }, { path: 'claims' }])
    if (!product) { // Check if product is null (findOne returns null if not found)
      return response.status(404).json({ error: 'Product not found' })
    }
    response.status(200).json(product)
  } catch (error) {
    next(error)
  }
})

// Search products with pagination moves to publicProductRouter
publicProductRouter.get('/search', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const cursor = req.query.cursor
    const searchQuery = req.query.q

    const queryCriteria = {}
    if (searchQuery) {
      queryCriteria.name = { $regex: searchQuery, $options: 'i' }
    }

    const sortCriteria = { name: 1, _id: 1 } // Sort by name (asc), then _id (asc)

    if (cursor) {
      const cursorProduct = await Product.findById(cursor)
      if (!cursorProduct) {
        return res.status(400).json({ error: 'Invalid cursor' })
      }
      queryCriteria.$or = [
        { name: { $gt: cursorProduct.name } },
        { name: cursorProduct.name, _id: { $gt: cursorProduct._id } }
      ]
    }

    const products = await Product.find(queryCriteria)
      .sort(sortCriteria)
      .limit(limit + 1)

    let nextCursor = null
    if (products.length > limit) {
      nextCursor = products[limit - 1]._id.toString() // Use the _id of the last item in the current page
      products.pop() // Remove the extra item
    }

    const transformedProducts = products.map(product => product.toJSON())
    res.status(200).json({ products: transformedProducts, nextCursor })
  } catch (error) {
    next(error)
  }
})

module.exports = { productRouter, publicProductRouter }