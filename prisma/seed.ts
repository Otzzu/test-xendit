import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding database...');

    // Create default accounts
    const accounts = [
        { id: 1, balance: 0 },
        { id: 2, balance: 0 },
        { id: 3, balance: 0 },
    ];

    for (const account of accounts) {
        await prisma.account.upsert({
            where: { id: account.id },
            update: {},
            create: account,
        });
        console.log(`  ✓ Account ${account.id} created/exists`);
    }

    console.log('✅ Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
