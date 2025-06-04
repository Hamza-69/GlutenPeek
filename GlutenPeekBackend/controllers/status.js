const statusRouter = require('express').Router()
const Status = require('./../models/status')

statusRouter.patch('/:barcode', async (req, res, next) => {
  try {
    const productBarcode = parseInt(req.params.barcode, 10)
    if (isNaN(productBarcode)) {
      return res.status(400).json({ error: 'Invalid product barcode format.' })
    }

    const { status, explanation } = req.body

    const currentStatus = await Status.findOne({ productBarcode: productBarcode })

    if (!currentStatus) {
      return res.status(404).json({ message: 'Status not found' })
    }

    // Only update provided fields
    if (status !== undefined) currentStatus.status = status
    if (explanation !== undefined) currentStatus.explanation = explanation

    const updatedStatus = await currentStatus.save()

    res.status(200).json(updatedStatus)
  } catch (error) {
    next(error)
  }
})

statusRouter.post('/', async (req, res, next) => {
  try {
    const { productBarcode, status, explanation } = req.body // Destructure after user check
    const newStatus = new Status({
      productBarcode,
      status,
      explanation
    })
    const savedStatus = await newStatus.save()
    res.status(201).json(savedStatus)
  } catch (error) {
    next(error)
  }
})

module.exports = statusRouter