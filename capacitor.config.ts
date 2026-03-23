import type { CapacitorConfig } from '@capacitor/cli';

// Иконка приложения (масленка):
// https://cdn.poehali.dev/projects/3cdd9cd7-5593-4904-947d-4e73989e29c5/files/2bdbf047-6d34-4785-879b-4500d3ed766e.jpg
// Загрузить в Android Studio: res → New → Image Asset → Launcher Icons

const config: CapacitorConfig = {
  appId: 'dev.poehali.carhelper',
  appName: 'Car Helper',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;