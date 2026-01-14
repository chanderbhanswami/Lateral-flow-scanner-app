import axios from 'axios';
import { logger } from '../utils/logger';
import { retry } from '../utils/helpers';

interface WebhookPayload {
    event: string;
    data: any;
    timestamp: string;
}

class WebhookService {
    async sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
        try {
            await retry(
                async () => {
                    await axios.post(url, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Webhook-Signature': this.generateSignature(payload),
                        },
                        timeout: 5000,
                    });
                },
                { retries: 3, delay: 1000 }
            );

            logger.info(`Webhook sent to ${url}`);
        } catch (error) {
            logger.error('Webhook send error:', error);
            throw error;
        }
    }

    private generateSignature(payload: WebhookPayload): string {
        // Implement HMAC signature generation
        return 'signature';
    }

    async notifyCaptureComplete(captureId: string, webhookUrl?: string): Promise<void> {
        if (!webhookUrl) return;

        await this.sendWebhook(webhookUrl, {
            event: 'capture.completed',
            data: { captureId },
            timestamp: new Date().toISOString(),
        });
    }
}

export const webhookService = new WebhookService();