import { connectDatabase } from '../config/database';
import * as migration001 from './001_initial_setup';

const migrations = [
    { name: '001_initial_setup', up: migration001.up, down: migration001.down },
];

const runMigrations = async () => {
    try {
        await connectDatabase();
        console.log('Running migrations...');

        for (const migration of migrations) {
            console.log(`Running migration: ${migration.name}`);
            await migration.up();
        }

        console.log('All migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

const rollbackMigrations = async () => {
    try {
        await connectDatabase();
        console.log('Rolling back migrations...');

        for (const migration of migrations.reverse()) {
            console.log(`Rolling back migration: ${migration.name}`);
            await migration.down();
        }

        console.log('All migrations rolled back successfully');
        process.exit(0);
    } catch (error) {
        console.error('Rollback error:', error);
        process.exit(1);
    }
};

const command = process.argv[2];

if (command === 'up') {
    runMigrations();
} else if (command === 'down') {
    rollbackMigrations();
} else {
    console.log('Usage: ts-node migrations/run.ts [up|down]');
    process.exit(1);
}