import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Camera preview dimensions (3:4 aspect ratio)
export const CAMERA_WIDTH = SCREEN_WIDTH;
export const CAMERA_HEIGHT = CAMERA_WIDTH * (4 / 3);

// ============================================================
// Standard Generic Cassette (70mm × 20mm = 3.5:1 aspect ratio)
// The result window should appear as a WIDE rectangle
// ============================================================

// Cassette size: ~30% of camera width, with 3.5:1 aspect ratio
export const CASSETTE_WIDTH = CAMERA_WIDTH * 0.30;
export const CASSETTE_HEIGHT = CASSETTE_WIDTH * 3.5; // 70mm / 20mm

// Center the cassette in the camera preview
export const GUIDE_X = (CAMERA_WIDTH - CASSETTE_WIDTH) / 2;
export const GUIDE_Y = (CAMERA_HEIGHT - CASSETTE_HEIGHT) / 2;

// Result Window - should be 15mm × 5mm on a 20mm × 70mm cassette
// Width: 15mm / 20mm = 75% of cassette width
// Height: 5mm / 70mm = 7% of cassette height
// This creates a WIDE rectangle (3:1 aspect ratio)
export const WINDOW_WIDTH = CASSETTE_WIDTH * 0.75;
export const WINDOW_HEIGHT = CASSETTE_HEIGHT * 0.07;
export const WINDOW_X_OFFSET = (CASSETTE_WIDTH - WINDOW_WIDTH) / 2; // Centered horizontally
export const WINDOW_Y_OFFSET = CASSETTE_HEIGHT * 0.35; // 35% from top

// Sample Well - 4mm diameter circle at 10mm from bottom
// Width: 4mm / 20mm = 20% of cassette width
// Position: (70mm - 10mm) / 70mm = 86% from top
export const SAMPLE_WELL_WIDTH = CASSETTE_WIDTH * 0.20;
export const SAMPLE_WELL_HEIGHT = SAMPLE_WELL_WIDTH; // Circle
export const SAMPLE_WELL_X_OFFSET = (CASSETTE_WIDTH - SAMPLE_WELL_WIDTH) / 2; // Centered
export const SAMPLE_WELL_Y_OFFSET = CASSETTE_HEIGHT * 0.86;

// For backward compatibility
export const SAMPLE_WELL_RADIUS = SAMPLE_WELL_WIDTH / 2;
