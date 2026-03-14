const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://siddheshkadane_db_user:Z7LoPC6KSWwQ05dz@cluster0.llztwno.mongodb.net/?appName=Cluster0');
  const email = 'sidd@gmail.com';
  const password = '123'; // just a guess
  const user = await User.findOne({ email });
  console.log('User found:', user ? 'Yes' : 'No');
  if (user) {
    console.log('User password hash:', user.password);
    if (user.password) {
        // try comparing just in case
        console.log('Compare "123":', await bcrypt.compare('123', user.password));
        console.log('Compare "password":', await bcrypt.compare('password', user.password));
    }
  }
  process.exit(0);
}
test();
