require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const httpStatusText = require('./utilities/httpStatusText');
const categoriesRouter = require('./routes/category.routes');
const referencesRouter = require('./routes/reference.routes');

// Basic Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/categories', categoriesRouter);
app.use('/api/references', referencesRouter);

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'DevMemory API is running...' });
});

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: httpStatusText.ERROR,
    message: 'Resource not found',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let statusText = err.statusText || httpStatusText.ERROR;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    statusText = httpStatusText.FAIL;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    statusText = httpStatusText.FAIL;
    const fields = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'field';
    message = `Duplicate value for ${fields}. Please use another value.`;
  }

  // Handle Mongoose Schema ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    statusText = httpStatusText.FAIL;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  res.status(statusCode).json({
    status: statusText,
    message,
    code: statusCode,
    data: null,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

