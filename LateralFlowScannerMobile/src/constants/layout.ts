import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Camera preview dimensions (3:4 aspect ratio)
export const CAMERA_WIDTH = SCREEN_WIDTH;
export const CAMERA_HEIGHT = CAMERA_WIDTH * (4 / 3);

// ============================================================
// Standard Generic Cassette (70mm × 20mm = 3.5:1 aspect ratio)
// ============================================================

// Cassette size: ~30% of camera width, with 3.5:1 aspect ratio
export const CASSETTE_WIDTH = CAMERA_WIDTH * 0.30;
export const CASSETTE_HEIGHT = CASSETTE_WIDTH * 3.5; // 70mm / 20mm

// Center the cassette in the camera preview
export const GUIDE_X = (CAMERA_WIDTH - CASSETTE_WIDTH) / 2;
export const GUIDE_Y = (CAMERA_HEIGHT - CASSETTE_HEIGHT) / 2;

// Result Window - TALL narrow rectangle
// Width: 50% of cassette width (narrow)
// Height: 25% of cassette height (tall on a 3.5:1 ratio = 3:1 aspect)
export const WINDOW_WIDTH = CASSETTE_WIDTH * 0.50;
export const WINDOW_HEIGHT = CASSETTE_HEIGHT * 0.25;
export const WINDOW_X_OFFSET = (CASSETTE_WIDTH - WINDOW_WIDTH) / 2;
export const WINDOW_Y_OFFSET = CASSETTE_HEIGHT * 0.20; // 20% from top

// Sample Well - centered circle at bottom
export const SAMPLE_WELL_WIDTH = CASSETTE_WIDTH * 0.25;
export const SAMPLE_WELL_HEIGHT = SAMPLE_WELL_WIDTH; // Circle
export const SAMPLE_WELL_X_OFFSET = (CASSETTE_WIDTH - SAMPLE_WELL_WIDTH) / 2;
export const SAMPLE_WELL_Y_OFFSET = CASSETTE_HEIGHT * 0.80; // 80% from top

// For backward compatibility
export const SAMPLE_WELL_RADIUS = SAMPLE_WELL_WIDTH / 2;
