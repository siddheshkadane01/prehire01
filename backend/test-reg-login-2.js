const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const crypto = require('crypto');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://siddheshkadane_db_user:Z7LoPC6KSWwQ05dz@cluster0.llztwno.mongodb.net/?appName=Cluster0');
  
  const testEmail = `test-${crypto.randomBytes(4).toString('hex')}@gmail.com`;
  const password = 'mySecretPassword123';
  
  console.log('Creating user with email:', testEmail);
  const user = new User({
      name: 'Test Setup',
      email: testEmail,
      password: password,
      role: 'candidate'
  });
  await user.save();
  
  const foundUser = await User.findOne({ email: testEmail });
  
  console.log('Saved password hash:', foundUser.password);
  
  const isMatch = await foundUser.comparePassword(password);
  console.log('Login algorithm test result:', isMatch ? 'SUCCESS' : 'FAILED');
  
  await User.deleteOne({ email: testEmail });
  
  process.exit(0);
}
test();