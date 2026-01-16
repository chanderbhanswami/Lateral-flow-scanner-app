const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
    transformer: {
        babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
    resolver: {
        assetExts: getDefaultConfig(__dirname).resolver.assetExts.filter(
            ext => ext !== 'svg',
        ),
        sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'svg'],
    },
};

const { wrapWithSentryConfig } = require('@sentry/react-native/metro');

module.exports = wrapWithSentryConfig(mergeConfig(getDefaultConfig(__dirname), config));