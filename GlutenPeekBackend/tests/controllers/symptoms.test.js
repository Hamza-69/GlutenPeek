// tests/controllers/symptoms.test.js
const supertest = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app'); // Assuming your Express app is exported from app.js
const Symptom = require('../../models/symptom');
const Scan = require('../../models/scan');

// Mock the models
jest.mock('../../models/symptom');
jest.mock('../../models/scan');

// Mock request.user for authentication
// This middleware will be added to a specific route or globally for tests
const mockAuthUser = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId().toString() };
  next();
};

// It's often better to apply middleware directly to the router or app instance used for testing
// For this example, we'll assume 'app' can be augmented or a test-specific app instance is created.
// If app.js exports the app directly, and symptomRouter is mounted on /api/symptoms,
// we might need a way to inject this middleware before those routes.
// A simple way for now: we'll assume the main app can have middleware added for testing.
// This is a common challenge. A better way is to have a setup file for tests.

// For now, let's assume we can't easily inject middleware into the main 'app'
// without modifying app.js. The tests will need to be structured to work with
// the existing auth, or the auth check in the controller might need to be
// (temporarily for testing if absolutely necessary and difficult to mock) bypassed.
// Let's proceed by trying to mock at the symptomRouter level if possible, or by ensuring
// the user object is on the request.

// A more practical approach for an existing app:
// The symptomRouter is imported in app.js and used.
// We will test the app instance directly.
// The auth check `if (!request.user || !request.user._id)` needs to be handled.
// We can create a separate test router that includes mockAuthUser and then the symptomRouter.

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let server;
let request;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Important: If your app.js connects to MongoDB on start, that might conflict.
  // Ensure your app.js can be imported without auto-connecting, or can accept a URI.
  // For this test, we assume app.js exports the app and routes are set up.
  // We also apply the mockAuthUser to the app instance for testing.
  // This is a common way to handle auth in tests if not using a more sophisticated setup.
  const express = require('express');
  const testApp = express();
  testApp.use(express.json()); // Ensure body parsing middleware is used
  testApp.use(mockAuthUser); // Apply mock auth for all test routes
  const symptomRouter = require('../../controllers/symptoms'); // require the actual router
  testApp.use('/api/symptoms', symptomRouter); // Mount it as it might be in app.js

  // server = testApp.listen(0); // Listen on a random free port
  request = supertest(testApp); // Use supertest with the testApp
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  // if (server) {
  //   server.close();
  // }
});

beforeEach(async () => {
  // Clear all mock implementations and calls
  jest.clearAllMocks();

  // Reset mock implementations if necessary, e.g., default successful save
  Symptom.prototype.save = jest.fn().mockResolvedValue(this);
  Scan.findById = jest.fn();
});


describe('POST /api/symptoms', () => {
  const validScanId = new mongoose.Types.ObjectId().toString();
  const productBarcode = 1234567890123;

  it('should create a symptom successfully with valid data and one scanId', async () => {
    Scan.findById.mockResolvedValue({ _id: validScanId, productBarcode: productBarcode });
    Symptom.prototype.save.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId().toString(),
      date: new Date(),
      productBarcode: productBarcode,
      scanId: validScanId,
      symptoms: { symptom1: 3, symptom2: 5 }, // Ensure this matches the new structure
      toJSON: function() {
        // Make sure the returned object also matches the expected structure
        const { _id, userId, date, productBarcode, scanId, symptoms } = this;
        return { id: _id.toString(), userId, date, productBarcode, scanId, symptoms };
      }
    });

    const response = await request
      .post('/api/symptoms')
      .query({ scanId: validScanId })
      .send({
        date: '2023-01-01T00:00:00.000Z',
        symptoms: { symptom1: 3, symptom2: 5 }
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveLength(1);
    // Ensure the assertion matches the toJSON mock and controller response
    expect(response.body[0].symptoms).toEqual({ symptom1: 3, symptom2: 5 });
    expect(Scan.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(validScanId));
    expect(Symptom.prototype.save).toHaveBeenCalledTimes(1);
  });

  it('should return 400 if date is missing', async () => {
    const response = await request
      .post('/api/symptoms')
      .query({ scanId: validScanId })
      .send({
        // date is missing
        symptoms: { symptom1: 3 }
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields in body: date, or symptoms.');
  });

  it('should return 400 if symptoms object is missing', async () => {
    const response = await request
      .post('/api/symptoms')
      .query({ scanId: validScanId })
      .send({
        date: '2023-01-01T00:00:00.000Z'
        // symptoms are missing
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields in body: date, or symptoms.');
  });

  it('should return 400 if no scanId is provided in query', async () => {
    const response = await request
      .post('/api/symptoms')
      // no scanId in query
      .send({
        date: '2023-01-01T00:00:00.000Z',
        symptoms: { symptom1: 3 }
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No scan id provided in query parameters.');
  });

  it('should return 500 if Scan.findById returns null (invalid scanId)', async () => {
    Scan.findById.mockResolvedValue(null); // Simulate scanId not found

    const response = await request
      .post('/api/symptoms')
      .query({ scanId: validScanId })
      .send({
        date: '2023-01-01T00:00:00.000Z',
        symptoms: { symptom1: 3 }
      });
    expect(response.status).toBe(500);
  });

  it('should return 500 if symptoms data is invalid (triggering Mongoose validation)', async () => {
    Scan.findById.mockResolvedValue({ _id: validScanId, productBarcode: productBarcode });
    Symptom.prototype.save = jest.fn().mockImplementation(() => {
      const err = new Error("Symptom validation failed: symptoms: Path `symptoms` is required."); // Updated error message
      err.name = "ValidationError";
      return Promise.reject(err);
    });

    const response = await request
      .post('/api/symptoms')
      .query({ scanId: validScanId })
      .send({
        date: '2023-01-01T00:00:00.000Z',
        symptoms: { symptom1: 7 } // Invalid severity
      });
     expect(response.status).toBe(500);
  });
});
