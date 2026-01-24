/**
 * Simple 2D Kalman Filter for stabilizing kit detection coordinates.
 * Tracks [x, y, dx, dy] (Position & Velocity).
 * 
 * Used to smooth out jitter from the Canny Edge detector and predict
 * location during brief occlusions.
 */
export class KalmanFilter2D {
    // State Vector [x, y, dx, dy]
    private x: number = 0;
    private y: number = 0;
    private dx: number = 0;
    private dy: number = 0;

    // Covariance Matrix (Uncertainty) - Normalized Scale
    private p: number[] = [1, 1, 0.5, 0.5];

    // Process Noise (Q) - Normalized
    // How much the object actually moves per second (0.005 = 0.5% of screen)
    private q: number = 0.005;

    // Measurement Noise (R) - Normalized
    // Expected jitter in detection (0.01 = 1% error)
    // Decreasing R makes it trust measurement more (faster response)
    // Increasing R makes it trust model more (smoother)
    private r: number = 0.01;

    // Last update time for velocity calculation
    private lastTime: number = 0;

    constructor(initialX: number = 0, initialY: number = 0) {
        this.x = initialX;
        this.y = initialY;
        this.lastTime = Date.now();
    }

    /**
     * Prediction Step:
     * Estimate next state based on velocity.
     */
    predict() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000.0; // Seconds
        this.lastTime = now;

        // Model: x = x + dx * dt
        this.x += this.dx * dt;
        this.y += this.dy * dt;

        // Increase uncertainty (entropy always increases)
        this.p[0] += this.p[2] * dt + this.q;
        this.p[1] += this.p[3] * dt + this.q;
        this.p[2] += this.q;
        this.p[3] += this.q;
    }

    /**
     * Update Step:
     * Correct state based on new measurement.
     */
    update(measureX: number, measureY: number) {
        // Validation: Ignore wild jumps (measurement noise gating)
        // Normalized Space 0-1: A jump of 0.3 (30%) is huge.
        if (Math.abs(measureX - this.x) > 0.3 || Math.abs(measureY - this.y) > 0.3) {
            // If jump is too huge, maybe we lost tracking? 
            // For now, accept it but trust model more (High R) to damp it.
            // Or simple reset if it's the first lock.
        }

        // Kalman Gain (K)
        // K = P / (P + R)
        const kx = this.p[0] / (this.p[0] + this.r);
        const ky = this.p[1] / (this.p[1] + this.r);
        const kdx = this.p[2] / (this.p[2] + this.r); // Simplified
        const kdy = this.p[3] / (this.p[3] + this.r);

        // Measurement Residual (Error)
        const residX = measureX - this.x;
        const residY = measureY - this.y;

        // Update State
        this.x += kx * residX;
        this.y += ky * residY;
        // Implicitly update velocity based on position shift
        // In a full matrix implementation, K would properly distribute this.
        // Here we approximate velocity update:
        this.dx += kdx * (residX * 1.5); // 1.5 gain for responsiveness
        this.dy += kdy * (residY * 1.5);

        // Update Covariance
        // P = (I - K) * P
        this.p[0] *= (1 - kx);
        this.p[1] *= (1 - ky);
        this.p[2] *= (1 - kdx);
        this.p[3] *= (1 - kdy);
    }

    getState() {
        return { x: this.x, y: this.y };
    }

    reset(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.dx = 0;
        this.dy = 0;
        this.p = [100, 100, 10, 10];
        this.lastTime = Date.now();
    }
}
