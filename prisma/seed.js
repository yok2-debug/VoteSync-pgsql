const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ALL_PERMISSIONS = [
  'dashboard',
  'elections',
  'candidates',
  'voters',
  'categories',
  'recapitulation',
  'real_count',
  'settings',
  'users',
  'committees',
];

async function main() {
  console.log('Seeding database...');

  // 1. Create or update Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { id: 'role_super_admin' },
    update: {
      name: 'Super Admin',
      permissions: ALL_PERMISSIONS,
    },
    create: {
      id: 'role_super_admin',
      name: 'Super Admin',
      permissions: ALL_PERMISSIONS,
    },
  });
  console.log('Role Super Admin verified/created.');

  // 2. Create the initial admin only when it does not exist.
  // Existing admin passwords are never overwritten by the seed.
  const existingAdmin = await prisma.appUser.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!initialAdminPassword) {
      throw new Error('INITIAL_ADMIN_PASSWORD is not configured');
    }

    const hashedPassword = await bcrypt.hash(initialAdminPassword, 12);

    await prisma.appUser.create({
      data: {
        id: 'user_admin_default',
        username: 'admin',
        password: hashedPassword,
        roleId: superAdminRole.id,
      },
    });

    console.log('Initial Super Admin account created.');
  } else {
    console.log('Admin user already exists; password was not changed.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
