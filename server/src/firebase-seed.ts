import { firestoreService } from './lib/firestore';
import bcrypt from 'bcrypt';
import { config } from './config/env';

// User role constants
const USER_ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN', 
  WORKER: 'WORKER'
} as const;

async function seed() {
  try {
    console.log('🔥 Starting Firebase seed...');
    console.log('Configuration loaded:', {
      projectId: config.FIREBASE_PROJECT_ID,
      nodeEnv: config.NODE_ENV
    });

    // Create test companies
    console.log('🏢 Creating companies...');
    const company1 = await firestoreService.createCompany({
      name: 'Acme Bikes Ltd',
      isActive: true,
      featureFlags: {
        pdfReceipts: true,
        reports: true
      }
    });

    const company2 = await firestoreService.createCompany({
      name: 'SpeedWheel Inc',
      isActive: true,
      featureFlags: {
        pdfReceipts: true,
        reports: true
      }
    });

    const company3 = await firestoreService.createCompany({
      name: 'Thunder Motors',
      isActive: false, // Suspended company for testing
      featureFlags: {
        pdfReceipts: true,
        reports: true
      }
    });

    // Create superadmin users
    console.log('👑 Creating superadmins...');
    const superadmin = await firestoreService.createUser({
      email: 'admin@bikers.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: USER_ROLES.SUPERADMIN
    });

    const superadmin2 = await firestoreService.createUser({
      email: 'ragavan212205@gmail.com',
      passwordHash: await bcrypt.hash('123456', 10),
      role: USER_ROLES.SUPERADMIN
    });

    // Create company admin users
    console.log('👥 Creating admin users...');
    const admin1 = await firestoreService.createUser({
      email: 'admin@acme.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: USER_ROLES.ADMIN,
      companyId: company1.id
    });

    const admin2 = await firestoreService.createUser({
      email: 'admin@speedwheel.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: USER_ROLES.ADMIN,
      companyId: company2.id
    });

    const admin3 = await firestoreService.createUser({
      email: 'admin@thunder.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: USER_ROLES.ADMIN,
      companyId: company3.id
    });

    // Create worker users
    console.log('🔧 Creating worker users...');
    const worker1 = await firestoreService.createUser({
      email: 'worker@acme.com',
      passwordHash: await bcrypt.hash('worker123', 10),
      role: USER_ROLES.WORKER,
      companyId: company1.id
    });

    const worker2 = await firestoreService.createUser({
      email: 'worker@speedwheel.com',
      passwordHash: await bcrypt.hash('worker123', 10),
      role: USER_ROLES.WORKER,
      companyId: company2.id
    });

    // Create customers
    console.log('👤 Creating customers...');
    const customer1 = await firestoreService.createCustomer({
      name: 'John Doe',
      phone: '+91-9876543210',
      aadhaarNumber: '1234-5678-9012',
      address: '123 Main Street, Chennai, Tamil Nadu 600001'
    });

    const customer2 = await firestoreService.createCustomer({
      name: 'Jane Smith',
      phone: '+91-8765432109',
      aadhaarNumber: '9876-5432-1098',
      address: '456 Park Avenue, Mumbai, Maharashtra 400001'
    });

    const customer3 = await firestoreService.createCustomer({
      name: 'Mike Johnson',
      phone: '+91-7654321098',
      aadhaarNumber: '5555-6666-7777',
      address: '789 Oak Road, Bangalore, Karnataka 560001'
    });

    // Create bikes
    console.log('🏍️ Creating bikes...');
    
    // Acme Bikes
    const bike1 = await firestoreService.createBike({
      name: 'Royal Enfield Classic 350',
      regNo: 'TN01AB1234',
      aadhaarNumber: '1111-2222-3333',
      boughtPrice: 180000,
      isSold: false,
      companyId: company1.id,
      addedById: admin1.id
    });

    const bike2 = await firestoreService.createBike({
      name: 'Honda CB Shine',
      regNo: 'TN02CD5678',
      aadhaarNumber: '4444-5555-6666',
      boughtPrice: 85000,
      soldPrice: 95000,
      isSold: true,
      companyId: company1.id,
      addedById: worker1.id,
      customerId: customer1.id
    });

    const bike3 = await firestoreService.createBike({
      name: 'TVS Apache RTR 160',
      regNo: 'TN03EF9012',
      aadhaarNumber: '7777-8888-9999',
      boughtPrice: 120000,
      isSold: false,
      companyId: company1.id,
      addedById: admin1.id
    });

    // SpeedWheel Bikes
    const bike4 = await firestoreService.createBike({
      name: 'Bajaj Pulsar 220F',
      regNo: 'KA01GH3456',
      aadhaarNumber: '1010-2020-3030',
      boughtPrice: 140000,
      soldPrice: 150000,
      isSold: true,
      companyId: company2.id,
      addedById: admin2.id,
      customerId: customer2.id
    });

    const bike5 = await firestoreService.createBike({
      name: 'Yamaha FZ25',
      regNo: 'KA02IJ7890',
      aadhaarNumber: '4040-5050-6060',
      boughtPrice: 160000,
      isSold: false,
      companyId: company2.id,
      addedById: worker2.id
    });

    const bike6 = await firestoreService.createBike({
      name: 'KTM Duke 250',
      regNo: 'MH01KL2345',
      aadhaarNumber: '7070-8080-9090',
      boughtPrice: 220000,
      soldPrice: 235000,
      isSold: true,
      companyId: company2.id,
      addedById: admin2.id,
      customerId: customer3.id
    });

    const bike7 = await firestoreService.createBike({
      name: 'Hero Splendor Plus',
      regNo: 'DL04MN6789',
      aadhaarNumber: '1212-3434-5656',
      boughtPrice: 70000,
      isSold: false,
      companyId: company2.id,
      addedById: worker2.id
    });

    // Create sample announcements
    console.log('📢 Creating announcements...');
    await firestoreService.createAnnouncement({
      message: 'System maintenance scheduled for this weekend from 2 AM to 6 AM. All services will be temporarily unavailable.'
    });

    await firestoreService.createAnnouncement({
      message: 'New inventory management features are now available! Check out the updated dashboard.',
      target: company1.id
    });

    await firestoreService.createAnnouncement({
      message: 'Welcome to our premium bike management platform! Contact support for any assistance.',
      target: company2.id
    });

    await firestoreService.createAnnouncement({
      message: 'Your account has been temporarily suspended. Please contact the system administrator.',
      target: company3.id
    });

    console.log('✅ Firebase seed data created successfully!');
    console.log('');
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('===================');
    console.log('Superadmin Portal:');
    console.log('  📧 Email: admin@bikers.com');
    console.log('  🔒 Password: admin123');
    console.log('');
    console.log('  📧 Email: ragavan212205@gmail.com');
    console.log('  🔒 Password: 123456');
    console.log('');
    console.log('Tenant Portal:');
    console.log('  🏢 Acme Bikes Admin: admin@acme.com / admin123');
    console.log('  🏢 Acme Bikes Worker: worker@acme.com / worker123');
    console.log('  🏢 SpeedWheel Admin: admin@speedwheel.com / admin123');
    console.log('  🏢 SpeedWheel Worker: worker@speedwheel.com / worker123');
    console.log('  🏢 Thunder Admin: admin@thunder.com / admin123 (Suspended Company)');
    console.log('');
    console.log('📊 SAMPLE DATA:');
    console.log('==============');
    
    // Get counts from Firestore
    const stats = await firestoreService.getSystemStats();
    console.log(`  • ${stats.overview.totalCompanies} Companies (${stats.overview.activeCompanies} active, ${stats.overview.suspendedCompanies} suspended)`);
    console.log(`  • ${stats.overview.totalUsers} Users`);
    console.log(`  • ${stats.inventory.totalBikes} Bikes (${stats.inventory.soldBikes} sold, ${stats.inventory.availableBikes} available)`);
    
  } catch (error) {
    console.error('❌ Error seeding Firebase data:', error);
    process.exit(1);
  }
}

seed();