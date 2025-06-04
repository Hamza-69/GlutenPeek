const scanRouter = require('express').Router()
const Scan = require('./../models/scan')

scanRouter.post('/', async (request, response, next) => {
  try {
    if (!request.user || !request.user._id) {
      return response.status(401).json({ error: 'Unauthorized: User not available' })
    }
    const { productBarcode, date } =  request.body // Use const

    const scan = new Scan({
      productBarcode,
      userId: request.user._id,
      date
    })
    const savedScan = await scan.save()
    response.status(201).json(savedScan)
  } catch (error) {
    next(error)
  }
})

module.exports = scanRouter