export const calculateHistogramStats = (histogram: number[]): {
    mean: number;
    median: number;
    mode: number;
    std: number;
} => {
    let sum = 0;
    let count = 0;
    let maxCount = 0;
    let mode = 0;

    // Calculate mean and mode
    for (let i = 0; i < histogram.length; i++) {
        sum += histogram[i] * i;
        count += histogram[i];

        if (histogram[i] > maxCount) {
            maxCount = histogram[i];
            mode = i;
        }
    }

    const mean = count > 0 ? sum / count : 0;

    // Calculate median
    let cumulative = 0;
    let median = 0;
    const halfCount = count / 2;

    for (let i = 0; i < histogram.length; i++) {
        cumulative += histogram[i];
        if (cumulative >= halfCount) {
            median = i;
            break;
        }
    }

    // Calculate standard deviation
    let sumSquares = 0;
    for (let i = 0; i < histogram.length; i++) {
        const diff = i - mean;
        sumSquares += histogram[i] * diff * diff;
    }

    const std = count > 0 ? Math.sqrt(sumSquares / count) : 0;

    return { mean, median, mode, std };
};

export const equalizeHistogram = (histogram: number[]): number[] => {
    const total = histogram.reduce((a, b) => a + b, 0);
    const cdf: number[] = [];
    let cumulative = 0;

    // Calculate CDF
    for (let i = 0; i < histogram.length; i++) {
        cumulative += histogram[i];
        cdf[i] = cumulative;
    }

    // Normalize CDF
    const cdfMin = cdf.find(v => v > 0) || 0;
    const equalized: number[] = [];

    for (let i = 0; i < histogram.length; i++) {
        equalized[i] = Math.round(((cdf[i] - cdfMin) / (total - cdfMin)) * 255);
    }

    return equalized;
};