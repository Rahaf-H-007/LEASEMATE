const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const path = require('path');

const app = express();
connectDB();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

//global error handler
app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    status: error.StatusText || 'ERROR',
    message: error.message,
    code: error.statusCode || 500,
    data: null,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
