# Assets Directory

This directory contains static assets for the application.

## Structure

```
assets/
├── images/          # Image assets
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
├── fonts/           # Custom fonts
└── icons/           # Icon sets
```

## Image Specifications

### App Icon (icon.png)
- Size: 1024x1024px
- Format: PNG
- Background: Transparent or solid color

### Splash Screen (splash.png)
- Size: 2048x2048px
- Format: PNG
- Background: Solid color matching brand

### Adaptive Icon (Android)
- Size: 432x432px
- Safe zone: 264x264px (centered)
- Format: PNG

## Adding New Assets

1. Place assets in appropriate subdirectory
2. Reference in code: `require('./assets/images/icon.png')`
3. For fonts, add to `react-native.config.js`