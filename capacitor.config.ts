import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.morohara.yanotou',
  appName: '矢の塔',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
