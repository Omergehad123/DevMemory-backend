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
  res.status(err.statusCode || 500).json({
    status: err.statusText || httpStatusText.ERROR,
    message: err.message || 'Internal Server Error',
    code: err.statusCode || 500,
    data: null,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

