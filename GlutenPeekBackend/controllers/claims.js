const claimsRouter = require('express').Router()
const publicClaimsRouter = require('express').Router() // New router for public routes
const Claim = require('./../models/claim')
const Product = require('./../models/product')

// Search claims with pagination (public route) - Moved to publicClaimsRouter
publicClaimsRouter.get('/search', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10
    const cursor = req.query.cursor
    const searchQuery = req.query.q

    const queryCriteria = {}
    if (searchQuery) {
      queryCriteria.explanation = { $regex: searchQuery, $options: 'i' }
    }

    const sortCriteria = { explanation: 1, _id: 1 } // Sort by explanation (asc), then _id (asc)

    if (cursor) {
      const cursorClaim = await Claim.findById(cursor).select('explanation _id').lean()
      if (!cursorClaim) {
        return res.status(400).json({ error: 'Invalid cursor' })
      }
      queryCriteria.$or = [
        { explanation: { $gt: cursorClaim.explanation } },
        { explanation: cursorClaim.explanation, _id: { $gt: cursorClaim._id } }
      ]
    }

    const claims = await Claim.find(queryCriteria)
      .sort(sortCriteria)
      .limit(limit + 1)
      // Optionally, populate related data if needed for display, e.g., user or product info
      // .populate('userId', 'name pfp') // Example: if you want to show who made the claim
      // .populate('productBarcode', 'name') // Example: if you want to show product name

    let nextCursor = null
    if (claims.length > limit) {
      nextCursor = claims[limit - 1]._id.toString()
      claims.pop() // Remove the extra item
    }

    // Ensure toJSON is called for each claim to apply transformations (e.g., _id to id)
    const transformedClaims = claims.map(claim => claim.toJSON())

    res.status(200).json({ claims: transformedClaims, nextCursor })
  } catch (error) {
    next(error)
  }
})

// Authenticated routes remain on claimsRouter
claimsRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to view all claims. Admin role might be necessary.' });
    }
    const claims = await Claim.find({})
    res.json(claims)
  } catch (error) {
    next(error)
  }
})

// Admin: Close or update a claim's status and explanation
claimsRouter.patch('/:id/status', async (request, response, next) => {
  try {
    // 1. Authenticate and Authorize Admin
    if (!request.user) {
      return response.status(401).json({ error: 'Authentication required.' })
    }
    if (request.user.email !== 'admin@glutenpeek.com') {
      return response.status(403).json({ error: 'Forbidden: Only admins can modify claim statuses.' })
    }

    const { id: claimId } = request.params
    const { status, explanation } = request.body

    // 2. Validate input
    if (typeof status !== 'boolean') {
      return response.status(400).json({ error: 'Invalid status format. Must be true or false.' })
    }
    if (status === true && (typeof explanation !== 'string' || explanation.trim() === '')) {
      // Require explanation only if closing the claim (status: true)
      return response.status(400).json({ error: 'Explanation is required when closing a claim.' })
    }


    // 3. Find and Update Claim
    const claim = await Claim.findById(claimId)
    if (!claim) {
      return response.status(404).json({ error: 'Claim not found.' })
    }

    claim.status = status
    // Only update explanation if provided, especially useful if admin wants to reopen without changing original explanation
    // or wants to add a closing explanation.
    if (explanation !== undefined) {
        claim.explanation = explanation
    } else if (status === true && claim.explanation.trim() === '') {
        // If closing and no new explanation is provided, and old one is empty, this might be an issue.
        // However, the previous check for (status === true && explanation is empty) should catch this.
        // This is more of a safeguard or if logic changes.
    }


    const updatedClaim = await claim.save()

    // 4. Respond
    response.status(200).json(updatedClaim)

  } catch (error) {
    // Handle potential errors like invalid ObjectId for claimId
    if (error.name === 'CastError' && error.path === '_id') {
        return response.status(400).json({ error: 'Invalid claim ID format.' });
    }
    next(error)
  }
})

claimsRouter.get('/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' })
    }
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to view these claims.' })
    }
    const claims = await Claim.find({ userId: req.params.id })
    res.status(200).json(claims)
  } catch (error) {
    next(error)
  }
})

claimsRouter.post('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Unauthorized: User not available' })
    }
    const { productBarcode, explanation, mediaProofUrl } = req.body // Destructure after user check

    const productExists = await Product.findOne({ barcode: productBarcode });
    if (!productExists) {
      return res.status(404).json({ error: 'Product with the given barcode not found.' });
    }

    const claim = new Claim({
      userId: req.user._id,
      productBarcode,
      explanation,
      mediaProofUrl,
      status: false // Explicitly setting default, though schema might handle it
    })
    const savedClaim = await claim.save()
    res.status(201).json(savedClaim)
  } catch (error) {
    next(error)
  }
})

module.exports = { claimsRouter, publicClaimsRouter } // Export both routers