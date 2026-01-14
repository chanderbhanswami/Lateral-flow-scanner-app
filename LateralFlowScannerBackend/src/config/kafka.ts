import { Kafka, Producer, Consumer } from 'kafkajs';
import { config } from './env';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

export const initializeKafka = async (): Promise<void> => {
    try {
        // Load SSL CA certificate for Aiven Kafka
        const caPath = path.resolve(process.cwd(), 'certs', 'ca.pem');
        const ssl = fs.existsSync(caPath)
            ? { ca: [fs.readFileSync(caPath, 'utf-8')] }
            : undefined;

        kafka = new Kafka({
            clientId: config.KAFKA_CLIENT_ID,
            brokers: config.KAFKA_BROKERS.split(','),
            ssl: ssl,
        });

        producer = kafka.producer();
        await producer.connect();

        consumer = kafka.consumer({ groupId: config.KAFKA_CLIENT_ID });
        await consumer.connect();

        logger.info('Kafka initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize Kafka:', error);
        throw error;
    }
};

export const getKafkaProducer = (): Producer => {
    if (!producer) {
        throw new Error('Kafka producer not initialized');
    }
    return producer;
};

export const getKafkaConsumer = (): Consumer => {
    if (!consumer) {
        throw new Error('Kafka consumer not initialized');
    }
    return consumer;
};
