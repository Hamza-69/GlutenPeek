const Scan = require('../models/scan')
const Symptom = require('../models/symptom')

const dayRouter = require('express').Router()

dayRouter.get('/', async (request, response, next) => {
  try {
    if (!request.user || !request.user._id) {
      return response.status(401).json({ error: 'Unauthorized: User not available' })
    }
    const userId = request.user._id

    if (!request.query.startdate || !request.query.enddate) {
      return response.status(400).json({ error: 'startdate and enddate query parameters are required.' })
    }

    const startDate = new Date(request.query.startdate)
    const endDate = new Date(request.query.enddate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return response.status(400).json({ error: 'Invalid startdate or enddate format.' })
    }

    if (startDate > endDate) {
      return response.status(400).json({ error: 'Start date must be before end date' })
    }

    const curr = new Date(startDate)
    const dateList = []
    while (curr <= endDate) {
      dateList.push(new Date(curr))
      curr.setDate(curr.getDate() + 1)
    }

    // --- Corrected Date Handling for Database Queries ---
    // For realSymptoms query
    const symptomsQueryEndDate = new Date(endDate)
    symptomsQueryEndDate.setDate(symptomsQueryEndDate.getDate() + 1) // Go to the next day
    symptomsQueryEndDate.setHours(0, 0, 0, 0) // Set to the beginning of that next day

    const realSymptoms = await Symptom.find({
      userId,
      date: { $gte: startDate, $lt: symptomsQueryEndDate },
    })

    // For realScans query
    const scansQueryEndDate = new Date(endDate)
    scansQueryEndDate.setDate(scansQueryEndDate.getDate() + 1) // Go to the next day
    scansQueryEndDate.setHours(0, 0, 0, 0) // Set to the beginning of that next day

    const realScans =  await Scan.find({
      userId,
      date: { $gte: startDate, $lt: scansQueryEndDate },
    })

    const realDays = dateList.map(date => {
      const key = date.toISOString().split('T')[0]
      return {
        date,
        scans: realScans.filter(scan => new Date(scan.date).toISOString().split('T')[0] === key),
        symptoms: realSymptoms.filter(symptom => new Date(symptom.date).toISOString().split('T')[0] === key),
        userId,
      }
    })

    response.json(realDays)
  } catch (error) {
    next(error)
  }
})

module.exports = dayRouter
