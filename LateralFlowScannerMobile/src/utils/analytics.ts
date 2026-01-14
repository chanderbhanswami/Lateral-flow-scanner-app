import { Platform } from 'react-native';

interface AnalyticsEvent {
    name: string;
    properties?: Record<string, any>;
    timestamp: number;
}

class AnalyticsService {
    private events: AnalyticsEvent[] = [];
    private enabled: boolean = true;

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    track(eventName: string, properties?: Record<string, any>) {
        if (!this.enabled) return;

        const event: AnalyticsEvent = {
            name: eventName,
            properties: {
                ...properties,
                platform: Platform.OS,
                timestamp: Date.now(),
            },
            timestamp: Date.now(),
        };

        this.events.push(event);
        this.sendEvent(event);
    }

    private async sendEvent(event: AnalyticsEvent) {
        // Implement actual analytics sending logic here
        // e.g., Firebase Analytics, Mixpanel, etc.
        console.log('Analytics Event:', event);
    }

    screen(screenName: string, properties?: Record<string, any>) {
        this.track('screen_view', {
            screen_name: screenName,
            ...properties,
        });
    }

    error(error: Error, context?: Record<string, any>) {
        this.track('error', {
            error_message: error.message,
            error_stack: error.stack,
            ...context,
        });
    }

    timing(category: string, variable: string, value: number) {
        this.track('timing', {
            category,
            variable,
            value,
        });
    }
}

export const analytics = new AnalyticsService();