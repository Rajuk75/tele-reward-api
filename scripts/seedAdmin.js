import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import config from '../src/core/config.js';
import User from '../src/modules/users/user.model.js';
import { USER_TYPE_ADMIN } from '../src/core/enums.js';

async function seedAdmin() {
  try {
    console.log(`Connecting to MongoDB: ${config.MONGO_URI.split('@')[1] || config.MONGO_URI}...`);
    await mongoose.connect(config.MONGO_URI);
    console.log('MongoDB Connected successfully.');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@adshamper.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    let user = await User.findOne({ email: adminEmail });

    if (user) {
      console.log(`Admin user with email "${adminEmail}" already exists. Updating password and permissions...`);
      user.password = adminPassword;
      user.userType = USER_TYPE_ADMIN;
      user.isActive = true;
      user.isDeleted = false;
      await user.save();
      console.log('Admin user updated successfully.');
    } else {
      console.log(`Creating new Admin user "${adminEmail}"...`);
      user = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        userType: USER_TYPE_ADMIN,
        isActive: true,
      });
      console.log('Admin user created successfully.');
    }

    console.log('\n======================================');
    console.log(' ADMIN LOGIN CREDENTIALS');
    console.log('======================================');
    console.log(` Email:    ${adminEmail}`);
    console.log(` Password: ${adminPassword}`);
    console.log(` Role:     ${user.userType}`);
    console.log('======================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin user:', err);
    process.exit(1);
  }
}

seedAdmin();
