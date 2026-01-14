import { User } from '../models/User.model';
import { ConcentrationBatch } from '../models/ConcentrationBatch.model';
import { connectDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

const seed = async () => {
    try {
        await connectDatabase();
        console.log('Seeding database...');

        // Create test user
        const hashedPassword = await bcrypt.hash('TestPass123!', 12);
        const user = await User.create({
            email: 'test@example.com',
            password: hashedPassword,
            name: 'Test User',
            role: 'user',
        });

        console.log('Created test user:', user.email);

        // Create concentration batches
        const batches = [
            {
                userId: user._id,
                name: 'Low Concentration',
                concentration: '10',
                unit: 'mg/mL',
                description: 'Low concentration for initial testing',
                color: '#3b82f6',
            },
            {
                userId: user._id,
                name: 'Medium Concentration',
                concentration: '50',
                unit: 'mg/mL',
                description: 'Medium concentration for standard testing',
                color: '#10b981',
            },
            {
                userId: user._id,
                name: 'High Concentration',
                concentration: '100',
                unit: 'mg/mL',
                description: 'High concentration for intensive testing',
                color: '#f59e0b',
            },
        ];

        await ConcentrationBatch.insertMany(batches);
        console.log(`Created ${batches.length} concentration batches`);

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seed();