import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Camera preview dimensions (3:4 aspect ratio)
export const CAMERA_WIDTH = SCREEN_WIDTH;
export const CAMERA_HEIGHT = CAMERA_WIDTH * (4 / 3);

// ============================================================
// HBsAg Long Format Cassette
// Physical Dimensions: ~80mm (H) x 20mm (W)
// Aspect Ratio: 4 : 1
// ============================================================

// Cassette scaling: Fit Height to 75% of Camera Height (for ample padding)
export const CASSETTE_HEIGHT = CAMERA_HEIGHT * 0.75;
export const CASSETTE_WIDTH = CASSETTE_HEIGHT / 4.0;

// Center the cassette in the camera preview
export const GUIDE_X = (CAMERA_WIDTH - CASSETTE_WIDTH) / 2;
export const GUIDE_Y = (CAMERA_HEIGHT - CASSETTE_HEIGHT) / 2;

// Result Window (Scan Area)
// Width: 40% of Cassette Width
// Height: 20% of Cassette Height
// Top Y: 38% from top
export const WINDOW_WIDTH = CASSETTE_WIDTH * 0.40;
export const WINDOW_HEIGHT = CASSETTE_HEIGHT * 0.20;
export const WINDOW_X_OFFSET = (CASSETTE_WIDTH - WINDOW_WIDTH) / 2;
export const WINDOW_Y_OFFSET = CASSETTE_HEIGHT * 0.38;

// Sample Well (Circle)
// Diameter: 40% of Cassette Width
// Top Y: 82% from top
export const SAMPLE_WELL_WIDTH = CASSETTE_WIDTH * 0.40;
export const SAMPLE_WELL_HEIGHT = SAMPLE_WELL_WIDTH; // Circular (1:1 aspect in pixels)
export const SAMPLE_WELL_X_OFFSET = (CASSETTE_WIDTH - SAMPLE_WELL_WIDTH) / 2;
export const SAMPLE_WELL_Y_OFFSET = CASSETTE_HEIGHT * 0.82;

// For backward compatibility
export const SAMPLE_WELL_RADIUS = SAMPLE_WELL_WIDTH / 2;
