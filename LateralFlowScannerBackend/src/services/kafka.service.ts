import { getKafkaProducer, getKafkaConsumer } from '../config/kafka';
import { logger } from '../utils/logger';
import { addImageProcessingJob } from '../jobs/imageProcessing.job';

class KafkaService {
    async sendCaptureEvent(data: {
        captureId: string;
        userId: string;
        imageUrl: string;
        timestamp: string;
    }): Promise<void> {
        try {
            const producer = getKafkaProducer();

            await producer.send({
                topic: 'capture-events',
                messages: [
                    {
                        key: data.captureId,
                        value: JSON.stringify(data),
                        timestamp: Date.now().toString(),
                    },
                ],
            });

            logger.info(`Capture event sent to Kafka: ${data.captureId}`);
        } catch (error) {
            logger.error('Kafka send error:', error);
            // Don't throw error, just log it
        }
    }

    async startConsumer(): Promise<void> {
        try {
            const consumer = getKafkaConsumer();

            await consumer.subscribe({ topic: 'capture-events', fromBeginning: false });

            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const data = JSON.parse(message.value?.toString() || '{}');
                        logger.info(`Processing capture event: ${data.captureId}`);

                        // Trigger image processing job via BullMQ
                        await addImageProcessingJob(data.captureId);

                        logger.info(`Added image processing job for: ${data.captureId}`);

                    } catch (error) {
                        logger.error('Kafka message processing error:', error);
                    }
                },
            });

            logger.info('Kafka consumer started');
        } catch (error) {
            logger.error('Kafka consumer error:', error);
            throw error;
        }
    }
}

export const kafkaService = new KafkaService();