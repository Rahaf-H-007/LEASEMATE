const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const unitRouter = require('./routes/unit.route');
const testLeaseRoutes = require('./routes/testLease.route');
const notificationRoutes = require('./routes/notification.route');
const httpStatusText = require('./utils/httpStatusText');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// Attach `io` to the app so routes/controllers can emit events
app.set('io', io);

io.on('connection', (socket) => {
  console.log('✅ WebSocket connected:', socket.id);

  socket.on('join', (userId) => {
    console.log(`📌 User ${userId} joined room`);
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected:', socket.id);
  });
});

connectDB();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/units', unitRouter);
app.use('/api/dev', testLeaseRoutes);
app.use('/api/notifications', notificationRoutes);

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
server.listen(PORT, () => console.log(`Server running on ${PORT}`));