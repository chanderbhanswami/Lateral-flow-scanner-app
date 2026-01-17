import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Camera preview dimensions (3:4 aspect ratio)
const CAMERA_WIDTH = SCREEN_WIDTH;
const CAMERA_HEIGHT = CAMERA_WIDTH * (4 / 3);

// Cassette dimensions based on reference:
// - Aspect Ratio: 3.5:1 (70mm x 20mm)
// - Should fit comfortably inside camera preview

// Cassette takes ~70% of camera width, centered
export const CASSETTE_WIDTH = CAMERA_WIDTH * 0.28; // Width is narrow (20mm)
export const CASSETTE_HEIGHT = CASSETTE_WIDTH * 3.5; // Height is 3.5x width (70mm)

// Center the cassette in the camera preview
export const GUIDE_X = (CAMERA_WIDTH - CASSETTE_WIDTH) / 2;
export const GUIDE_Y = (CAMERA_HEIGHT - CASSETTE_HEIGHT) / 2;

// Result Window: ~60% width, ~22% height, starts at ~35% from top, centered (~20% from left)
export const WINDOW_WIDTH = CASSETTE_WIDTH * 0.6;
export const WINDOW_HEIGHT = CASSETTE_HEIGHT * 0.22;
export const WINDOW_X_OFFSET = CASSETTE_WIDTH * 0.2; // 20% from left edge
export const WINDOW_Y_OFFSET = CASSETTE_HEIGHT * 0.35; // 35% from top

// Sample Well: ~20% width, ~6% height, at ~85% from top, centered (~40% from left)
export const SAMPLE_WELL_WIDTH = CASSETTE_WIDTH * 0.2;
export const SAMPLE_WELL_HEIGHT = CASSETTE_HEIGHT * 0.06;
export const SAMPLE_WELL_X_OFFSET = CASSETTE_WIDTH * 0.4; // 40% from left (centered)
export const SAMPLE_WELL_Y_OFFSET = CASSETTE_HEIGHT * 0.85; // 85% from top

// For backward compatibility
export const SAMPLE_WELL_RADIUS = SAMPLE_WELL_WIDTH / 2;
