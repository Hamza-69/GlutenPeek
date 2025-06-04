# GlutenPeek

GlutenPeek is a comprehensive application that helps users identify gluten content in food products through barcode scanning, AI-powered ingredient analysis, and community contributions.

![GlutenPeek App Banner](https://placeholder-for-banner-image.com/banner.jpg)

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Setup Instructions](#setup-instructions)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [API Keys and Services](#api-keys-and-services)
- [Connecting Frontend to Backend](#connecting-frontend-to-backend)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Barcode Scanning**: Scan product barcodes using your device's camera or upload product images
- **Product Database**: Access a growing database of gluten information for various products
- **AI Analysis**: Leverage Gemini AI to analyze product images and ingredients for gluten content
- **Product Status**: Get clear indicators of whether products are gluten-free, contain gluten, or unknown
- **User Profiles**: Track your scan history and monitor symptoms
- **Community Features**: Share product information and experiences with other users
- **Daily Tracking**: Record your meals and symptoms to identify patterns

## Architecture Overview

GlutenPeek consists of two main components:

1. **Backend (GlutenPeekBackend)**: Node.js/Express API server with MongoDB database
2. **Frontend (GlutenPeek-frontend)**: React application built with TypeScript and Vite

The application integrates with several external services:
- **Open Food Facts API**: Fetches product information from an open database
- **Barcode Scanning API**: Reads barcodes from images
- **AWS S3**: Stores product and user-uploaded images
- **Google Gemini AI**: Analyzes product images and ingredients for gluten content

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd GlutenPeekBackend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with the required credentials (see [API Keys and Services](#api-keys-and-services))

5. Start the development server:
   ```bash
   npm run dev
   ```

The backend server will start at http://localhost:3001 by default.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd GlutenPeek-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with the required credentials (see [API Keys and Services](#api-keys-and-services))

5. Start the development server:
   ```bash
   npm run dev
   ```

The frontend development server will start at http://localhost:5173 by default.

### API Keys and Services

#### MongoDB

The MongoDB connection string should already be configured in your backend `.env` file. If not, you can set up a MongoDB database:

1. Create a free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Set up a new cluster and get your connection string
3. Add the connection string to your backend `.env` file as `MONGODB_URI`

#### AWS S3

To set up AWS S3 for image storage:

1. Create an AWS account at https://aws.amazon.com/ if you don't have one
2. Navigate to the S3 service and create a new bucket
3. Configure CORS on your bucket to allow uploads from your frontend domain
4. Create an IAM user with S3 access permissions
5. Get your access key and secret key
6. Add the following to both your frontend and backend `.env` files:
   ```
   # Frontend
   VITE_AWS_S3_BUCKET_NAME=your-bucket-name
   VITE_AWS_S3_REGION=your-region
   VITE_AWS_S3_ACCESS_KEY_ID=your-access-key
   VITE_AWS_S3_SECRET_ACCESS_KEY=your-secret-key

   # Backend
   AWS_S3_BUCKET_NAME=your-bucket-name
   AWS_S3_REGION=your-region
   AWS_S3_ACCESS_KEY_ID=your-access-key
   AWS_S3_SECRET_ACCESS_KEY=your-secret-key
   ```

#### Barcode Scanning API

For barcode scanning capabilities:

1. Sign up for a ZXing or similar barcode scanning API (alternatives include Scandit, Dynamsoft, etc.)
2. Get your API key
3. Add to your frontend `.env` file:
   ```
   VITE_BARCODE_API_URL=https://api.zxing.io/v1/scan
   VITE_BARCODE_API_KEY=your-barcode-api-key
   ```

#### Open Food Facts API

The Open Food Facts API is free and doesn't require an API key. It's already configured in the application.

#### Google Gemini AI

The Gemini AI API key has already been provided:

```
VITE_GEMINI_API_KEY=AIzaSyDsx7srfxhs1qSbf3K6FKPW725ClmKdcbk
```

This key is already included in the `.env.example` files for both frontend and backend.

## Connecting Frontend to Backend

The frontend is configured to connect to the backend through the `VITE_API_BASE_URL` environment variable. By default, it points to `http://localhost:3001`.

To change this:

1. Update the `VITE_API_BASE_URL` in your frontend `.env` file to match your backend URL
2. If deploying to production, make sure to update this to your production backend URL

Important API endpoints:
- Authentication: `/api/login` and `/api/users`
- Products: `/api/products`
- Scans: `/api/scans`
- Status: `/api/status`

## Testing

### Backend Testing

Run the backend tests:

```bash
cd GlutenPeekBackend
npm test
```

### Frontend Testing

Run the frontend tests:

```bash
cd GlutenPeek-frontend
npm test
```

### Manual Testing Checklist

1. **User Authentication**
   - Registration
   - Login
   - Profile management

2. **Product Scanning**
   - Camera scanning
   - Image upload scanning
   - Barcode recognition

3. **Product Information**
   - Open Food Facts integration
   - AI-powered product analysis
   - Status updates

4. **AWS S3 Integration**
   - Image uploads
   - Image retrieval

## Troubleshooting

### Common Issues

#### Frontend API Connection Issues

If the frontend can't connect to the backend:

1. Check that both servers are running
2. Verify the `VITE_API_BASE_URL` in your frontend `.env` file
3. Check browser console for CORS errors
4. Ensure the backend has CORS enabled for your frontend URL

#### Image Upload Failures

If image uploads to AWS S3 fail:

1. Verify your AWS credentials in both `.env` files
2. Check that your S3 bucket CORS settings allow uploads
3. Ensure your IAM user has the correct permissions
4. Check browser console and server logs for specific error messages

#### Barcode Scanning Issues

If barcode scanning doesn't work:

1. Check your barcode API key in the frontend `.env` file
2. Ensure you're using a supported image format
3. Try with a clearer image of the barcode
4. Check browser console for API-specific error messages

#### Gemini AI Integration Issues

If AI analysis isn't working:

1. Verify the Gemini API key is correctly set in both `.env` files
2. Check that you're sending supported image formats
3. Ensure your request format matches Gemini API requirements
4. Look for specific error messages in browser console and server logs

### Getting Help

If you encounter issues not covered here:

1. Check the browser console and server logs for error messages
2. Open an issue in the GitHub repository with detailed information
3. Include steps to reproduce, expected behavior, and actual behavior

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

