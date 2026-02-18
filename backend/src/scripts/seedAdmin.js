const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@prehire.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@prehire.com');
      console.log('You can login with the password you set previously.');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      name: 'Super Admin',
      email: 'admin@prehire.com',
      password: 'admin123', // This will be hashed automatically by the pre-save hook
      role: 'admin'
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('=================================');
    console.log('Email: admin@prehire.com');
    console.log('Password: admin123');
    console.log('=================================');
    console.log('You can now login at: http://localhost:3000/admin/login');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
