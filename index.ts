import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

if (typeof document !== 'undefined') {
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = '/manifest.json';
  document.head.appendChild(manifest);
  const theme = document.createElement('meta');
  theme.name = 'theme-color';
  theme.content = '#0284C7';
  document.head.appendChild(theme);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
