import { connectDatabase } from './src/config/database';
import mongoose from 'mongoose';

beforeAll(async () => {
    await connectDatabase();
});

afterAll(async () => {
    await mongoose.connection.close();
});

beforeEach(async () => {
    // Clear database before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});