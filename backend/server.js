const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const maintenanceRoutes = require('./routes/maintenance.routes');
const unitRouter = require('./routes/unit.route');
const testLeaseRoutes = require('./routes/testLease.route');
const notificationRoutes = require('./routes/notification.route');
const httpStatusText = require('./utils/httpStatusText');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { setupSocket } = require('./socket');
const { startLeaseExpiryJob } = require('./utils/leaseExpiryJob');
const reviewRoutes = require("./routes/review.route");
const leaseRoutes = require("./routes/lease.routes");
const unitRoutes = require('./routes/unit.routes');

const app = express();
const server = http.createServer(app);


const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// setup socket listeners
setupSocket(io);

// start cron jobs and pass `io`
startLeaseExpiryJob(io);

connectDB();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/units', unitRoutes);
app.use("/api/leases", leaseRoutes);
app.use("/api/booking", require('./routes/booking.routes'));
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    status: error.StatusText || 'ERROR',
    message: error.message,
    code: error.statusCode || 500,
    data: null,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
