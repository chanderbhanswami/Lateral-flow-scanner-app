#!/bin/sh
set -e

WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
SENTRY_XCODE="$REACT_NATIVE_PATH/../@sentry/react-native/scripts/sentry-xcode.sh"

/bin/sh -c "\"$WITH_ENVIRONMENT\" \"$SENTRY_XCODE\""
