export const serializeUser = (user: any) => {
    return {
        id: user._id || user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

export const serializeCapture = (capture: any) => {
    return {
        captureId: capture.captureId,
        userId: capture.userId,
        timestamp: capture.timestamp,
        imageUrl: capture.imageUrl,
        concentration: capture.concentration,
        status: capture.status,
        captureMode: capture.captureMode,
        qualityScore: capture.analysisData?.qualityScore,
        createdAt: capture.createdAt,
    };
};

export const serializeConcentrationBatch = (batch: any) => {
    return {
        id: batch._id || batch.id,
        name: batch.name,
        concentration: batch.concentration,
        unit: batch.unit,
        description: batch.description,
        color: batch.color,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
    };
};