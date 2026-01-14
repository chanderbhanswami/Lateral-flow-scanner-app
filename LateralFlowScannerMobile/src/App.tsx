import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Sentry from '@sentry/react-native';
import AppNavigator from './navigation/AppNavigator';
import { setupInterceptors } from './api/interceptors';
import { initializeServices } from './services/initialization.service';
import { networkService } from './services/network.service';
import { toastConfig } from './config/toast.config';
import { ENV } from './config/env';

LogBox.ignoreAllLogs();

Sentry.init({
  dsn: ENV.SENTRY_DSN,
  environment: ENV.ENVIRONMENT,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Setup interceptors immediately at module load (before any components render)
// This prevents race conditions where API calls happen before interceptors are ready
setupInterceptors();

const App = () => {
  useEffect(() => {
    initializeServices();
    networkService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" />
            <AppNavigator />
            <Toast config={toastConfig} />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(App);