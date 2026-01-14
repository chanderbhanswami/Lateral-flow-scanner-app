import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Lateral Flow Scanner API',
            version: '1.0.0',
            description: 'API documentation for Lateral Flow Scanner application',
            contact: {
                name: 'API Support',
                email: 'support@lateralflowscanner.com',
            },
        },
        servers: [
            {
                url: config.NODE_ENV === 'production'
                    ? 'https://api.lateralflowscanner.com/api'
                    : 'http://localhost:3000/api',
                description: config.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'admin'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Capture: {
                    type: 'object',
                    properties: {
                        captureId: { type: 'string' },
                        userId: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        imageUrl: { type: 'string', format: 'uri' },
                        concentration: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'uploaded', 'processed', 'failed'] },
                        captureMode: { type: 'string', enum: ['auto', 'manual'] },
                    },
                },
                ConcentrationBatch: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        concentration: { type: 'string' },
                        unit: { type: 'string' },
                        description: { type: 'string' },
                        color: { type: 'string' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                message: { type: 'string' },
                                statusCode: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
