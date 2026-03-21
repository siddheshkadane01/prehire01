const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const seedEmployer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const existingEmployer = await User.findOne({ email: 'employer@prehire.com' });

    if (existingEmployer) {
      console.log('Employer user already exists!');
      console.log('=================================');
      console.log('Email:    employer@prehire.com');
      console.log('Password: employer123');
      console.log('Role:     recruiter');
      console.log('=================================');
      process.exit(0);
    }

    const employer = new User({
      name: 'Demo Employer',
      email: 'employer@prehire.com',
      password: 'employer123',
      role: 'recruiter',
      companyName: 'PreHire Demo Company',
    });

    await employer.save();

    console.log('✅ Employer user created successfully!');
    console.log('=================================');
    console.log('Email:    employer@prehire.com');
    console.log('Password: employer123');
    console.log('Role:     recruiter');
    console.log('=================================');
    console.log('Login at: http://localhost:3000/login');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding employer:', error);
    process.exit(1);
  }
};

seedEmployer();
