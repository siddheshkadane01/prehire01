const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

mongoose.connect('mongodb://localhost:27017/prehire')
.then(async () => {
  const users = await User.find({});
  let updated = 0;
  for (let u of users) {
    if (u.password && !u.password.startsWith('$2') && u.password.length < 50) {
      console.log(`Fixing plaintext password for: ${u.email}`);
      u.password = await bcrypt.hash(u.password, 12);
      await User.updateOne({ _id: u._id }, { password: u.password });
      updated++;
    }
  }
  console.log(`Fixed ${updated} legacy users with plaintext passwords.`);
  process.exit(0);
});
