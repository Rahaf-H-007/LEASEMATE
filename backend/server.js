const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const unitRouter = require('./routes/unit.route')
const path = require('path');
const httpStatusText = require("./utils/httpStatusText");

const app = express();
connectDB();

app.use(express.json());

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/units', unitRouter)

//global error handler
//route=>controller name=>asyncwrapper returns function which calls actual controller function with next and then passes it here
app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    status: error.StatusText || httpStatusText.ERROR,
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
