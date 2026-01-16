import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Cassette dimensions (relative to screen width)
export const CASSETTE_WIDTH = width * 0.6; // 60% of screen width
export const CASSETTE_HEIGHT = CASSETTE_WIDTH * 3.5; // Aspect ratio ~1:3.5
export const GUIDE_X = (width - CASSETTE_WIDTH) / 2;
export const GUIDE_Y = (height - CASSETTE_HEIGHT) / 2;

// Inner details relative to Cassette dimensions
export const WINDOW_WIDTH = CASSETTE_WIDTH * 0.4;
export const WINDOW_HEIGHT = CASSETTE_HEIGHT * 0.3;
export const WINDOW_Y_OFFSET = CASSETTE_HEIGHT * 0.25;

export const SAMPLE_WELL_RADIUS = CASSETTE_WIDTH * 0.15;
export const SAMPLE_WELL_Y_OFFSET = CASSETTE_HEIGHT * 0.8;
