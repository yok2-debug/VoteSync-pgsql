// prisma.config.ts - Prisma 7 configuration
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Load dotenv for Prisma CLI
import 'dotenv/config';

export default defineConfig({
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),

    migrations: {
        path: path.join(__dirname, 'prisma', 'migrations'),
    },

    datasource: {
        url: process.env.DATABASE_URL!,
    },
});
