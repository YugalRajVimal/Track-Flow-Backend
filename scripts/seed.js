require('dotenv').config();
const User = require('../src/models/User');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
      return;
    }

    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true,
    });

    console.log(`✅ Admin user seeded: ${adminEmail}`);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  }
};

// Allow running as standalone script
if (require.main === module) {
  const connectDB = require('../src/config/database');
  connectDB().then(async () => {
    await seedAdmin();
    process.exit(0);
  });
}

module.exports = seedAdmin;
