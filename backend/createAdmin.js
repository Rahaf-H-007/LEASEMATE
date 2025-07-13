const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@leasemate.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      name: 'Admin',
      email: 'admin@leasemate.com',
      password: 'admin123', // This will be hashed by the pre-save hook
      role: 'admin',
      verificationStatus: {
        status: 'approved',
        idVerified: true,
        faceMatched: true
      }
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@leasemate.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin(); 
