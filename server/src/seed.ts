import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// User role constants for SQLite compatibility
const USER_ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN', 
  WORKER: 'WORKER'
} as const;

const prisma = new PrismaClient();

async function seed() {
  try {
    // Clean existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.announcement.deleteMany();
    await prisma.bike.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();

    // Create test companies
    console.log('🏢 Creating companies...');
    const company1 = await prisma.company.create({
      data: {
        name: 'Acme Bikes Ltd',
        logo: null,
        isActive: true,
        featureFlags: JSON.stringify({
          pdfReceipts: true,
          reports: true
        })
      }
    });

    const company2 = await prisma.company.create({
      data: {
        name: 'SpeedWheel Inc',
        logo: null,
        isActive: true,
        featureFlags: JSON.stringify({
          pdfReceipts: true,
          reports: true
        })
      }
    });

    const company3 = await prisma.company.create({
      data: {
        name: 'Thunder Motors',
        logo: null,
        isActive: false, // Suspended company for testing
        featureFlags: JSON.stringify({
          pdfReceipts: true,
          reports: true
        })
      }
    });

    // Create superadmin user
    console.log('👑 Creating superadmin...');
    const superadmin = await prisma.user.create({
      data: {
        email: 'admin@bikers.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: USER_ROLES.SUPERADMIN,
        companyId: null
      }
    });

    // Create additional superadmin user
    const superadmin2 = await prisma.user.create({
      data: {
        email: 'ragavan212205@gmail.com',
        passwordHash: await bcrypt.hash('123456', 10),
        role: USER_ROLES.SUPERADMIN,
        companyId: null
      }
    });

    // Create company admin users
    console.log('👥 Creating admin users...');
    const admin1 = await prisma.user.create({
      data: {
        email: 'admin@acme.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: USER_ROLES.ADMIN,
        companyId: company1.id
      }
    });

    const admin2 = await prisma.user.create({
      data: {
        email: 'admin@speedwheel.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: USER_ROLES.ADMIN,
        companyId: company2.id
      }
    });

    const admin3 = await prisma.user.create({
      data: {
        email: 'admin@thunder.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: USER_ROLES.ADMIN,
        companyId: company3.id
      }
    });

    // Create worker users
    console.log('🔧 Creating worker users...');
    const worker1 = await prisma.user.create({
      data: {
        email: 'worker@acme.com',
        passwordHash: await bcrypt.hash('worker123', 10),
        role: USER_ROLES.WORKER,
        companyId: company1.id
      }
    });

    const worker2 = await prisma.user.create({
      data: {
        email: 'worker@speedwheel.com',
        passwordHash: await bcrypt.hash('worker123', 10),
        role: USER_ROLES.WORKER,
        companyId: company2.id
      }
    });

    // Create sample bikes
    console.log('🏍️ Creating sample bikes...');
    await prisma.bike.createMany({
      data: [
        // Acme Bikes
        {
          name: 'Honda CBR 600',
          regNo: 'CBR600-001',
          aadhaarNumber: '123456789012',
          boughtPrice: 8500.00,
          companyId: company1.id,
          addedById: admin1.id
        },
        {
          name: 'Yamaha R1',
          regNo: 'R1-001',
          aadhaarNumber: '234567890123',
          boughtPrice: 12000.00,
          soldPrice: 13500.00,
          isSold: true,
          companyId: company1.id,
          addedById: admin1.id
        },
        {
          name: 'Suzuki GSX-R750',
          regNo: 'GSX750-001',
          aadhaarNumber: '345678901234',
          boughtPrice: 9500.00,
          soldPrice: 10800.00,
          isSold: true,
          companyId: company1.id,
          addedById: worker1.id
        },
        // SpeedWheel Inc
        {
          name: 'Kawasaki Ninja',
          regNo: 'NINJA-001',
          aadhaarNumber: '456789012345',
          boughtPrice: 9500.00,
          companyId: company2.id,
          addedById: admin2.id
        },
        {
          name: 'Ducati Panigale',
          regNo: 'PANI-001',
          aadhaarNumber: '567890123456',
          boughtPrice: 15000.00,
          soldPrice: 16500.00,
          isSold: true,
          companyId: company2.id,
          addedById: admin2.id
        },
        {
          name: 'BMW S1000RR',
          regNo: 'BMW-001',
          aadhaarNumber: '678901234567',
          boughtPrice: 14000.00,
          companyId: company2.id,
          addedById: worker2.id
        },
        // Thunder Motors
        {
          name: 'Harley Davidson',
          regNo: 'HD-001',
          aadhaarNumber: '789012345678',
          boughtPrice: 18000.00,
          companyId: company3.id,
          addedById: admin3.id
        }
      ]
    });

    // Create sample announcements
    console.log('📢 Creating announcements...');
    await prisma.announcement.createMany({
      data: [
        {
          message: 'System maintenance scheduled for this weekend from 2 AM to 6 AM. All services will be temporarily unavailable.',
          target: null // Global
        },
        {
          message: 'New inventory management features are now available! Check out the updated dashboard.',
          target: company1.id
        },
        {
          message: 'Welcome to our premium bike management platform! Contact support for any assistance.',
          target: company2.id
        },
        {
          message: 'Your account has been temporarily suspended. Please contact the system administrator.',
          target: company3.id
        }
      ]
    });

    console.log('✅ Seed data created successfully!');
    console.log('');
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('===================');
    console.log('Superadmin Portal (http://localhost:3000):');
    console.log('  📧 Email: admin@bikers.com');
    console.log('  🔒 Password: admin123');
    console.log('');
    console.log('Tenant Portal (http://localhost:3001):');
    console.log('  🏢 Acme Bikes Admin: admin@acme.com / admin123');
    console.log('  🏢 Acme Bikes Worker: worker@acme.com / worker123');
    console.log('  🏢 SpeedWheel Admin: admin@speedwheel.com / admin123');
    console.log('  🏢 SpeedWheel Worker: worker@speedwheel.com / worker123');
    console.log('  🏢 Thunder Admin: admin@thunder.com / admin123 (Suspended Company)');
    console.log('');
    console.log('📊 SAMPLE DATA:');
    console.log('==============');
    console.log(`  • ${await prisma.company.count()} Companies (2 active, 1 suspended)`);
    console.log(`  • ${await prisma.user.count()} Users (1 superadmin, 3 admins, 2 workers)`);
    console.log(`  • ${await prisma.bike.count()} Bikes (3 sold, 4 available)`);
    console.log(`  • ${await prisma.announcement.count()} Announcements (1 global, 3 targeted)`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
