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

  // 2. Hash password for admin: 'admin'
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin', salt);

  // 3. Create or update admin user
  const adminUser = await prisma.appUser.upsert({
    where: { username: 'admin' },
    update: {
      roleId: superAdminRole.id,
    },
    create: {
      id: 'user_admin_default',
      username: 'admin',
      password: hashedPassword,
      roleId: superAdminRole.id,
    },
  });
  console.log(`Admin user '${adminUser.username}' verified/created with default password: admin`);
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
