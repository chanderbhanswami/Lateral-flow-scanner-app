import mongoose from 'mongoose';

export const up = async () => {
    const db = mongoose.connection.db;

    if (!db) {
        throw new Error('Database connection not established');
    }

    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('captures').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('captures').createIndex({ captureId: 1 }, { unique: true });
    await db.collection('concentrationbatches').createIndex({ userId: 1, isActive: 1 });
    await db.collection('auditlogs').createIndex({ userId: 1, timestamp: -1 });

    console.log('Migration 001: Initial setup completed');
};

export const down = async () => {
    const db = mongoose.connection.db;

    if (!db) {
        throw new Error('Database connection not established');
    }

    // Drop indexes
    await db.collection('users').dropIndex('email_1');
    await db.collection('captures').dropIndex('userId_1_timestamp_-1');
    await db.collection('captures').dropIndex('captureId_1');
    await db.collection('concentrationbatches').dropIndex('userId_1_isActive_1');
    await db.collection('auditlogs').dropIndex('userId_1_timestamp_-1');

    console.log('Migration 001: Rollback completed');
};