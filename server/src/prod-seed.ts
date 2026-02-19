import { firestoreService } from './lib/firestore';
import bcrypt from 'bcrypt';
import { config } from './config/env';

const USER_ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN', 
  WORKER: 'WORKER'
} as const;

async function seedProduction() {
  try {
    console.log('🔥 Starting production Firebase seed...');
    console.log('Environment:', config.NODE_ENV);
    console.log('Project ID:', config.FIREBASE_PROJECT_ID);

    // Check if companies already exist
    const existingCompanies = await firestoreService.findCompanies();
    if (existingCompanies.length > 0) {
      console.log(`✅ Found ${existingCompanies.length} existing companies. Skipping seed.`);
      return;
    }

    // Create default company
    console.log('🏢 Creating default company...');
    const defaultCompany = await firestoreService.createCompany({
      name: 'Default Bike Company',
      isActive: true,
      featureFlags: {
        pdfReceipts: true,
        reports: true
      }
    });
    console.log(`✅ Created company: ${defaultCompany.name} (ID: ${defaultCompany.id})`);

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superadmin = await firestoreService.createUser({
      email: 'admin@bikers.com',
      passwordHash: hashedPassword,
      role: USER_ROLES.SUPERADMIN,
      companyId: defaultCompany.id,
      isActive: true
    });
    console.log(`✅ Created superadmin: ${superadmin.email}`);

    // Create default admin user
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await firestoreService.createUser({
      email: 'tenant@bikers.com', 
      passwordHash: adminPassword,
      role: USER_ROLES.ADMIN,
      companyId: defaultCompany.id,
      isActive: true
    });
    console.log(`✅ Created admin: ${admin.email}`);

    console.log('🎉 Production seeding completed successfully!');
    console.log('📋 Login credentials:');
    console.log('   Superadmin: admin@bikers.com / admin123');
    console.log('   Admin: tenant@bikers.com / admin123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedProduction().then(() => {
    console.log('Seeding complete');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedProduction };