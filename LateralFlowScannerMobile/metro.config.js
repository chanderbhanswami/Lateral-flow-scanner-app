const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const {
    withSentryConfig
} = require("@sentry/react-native/metro");

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


module.exports = withSentryConfig(mergeConfig(getDefaultConfig(__dirname), config));