import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.culturebot.app',
  appName: 'CultureBot',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#050a14',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_brain',
      iconColor: '#2979FF',
      sound: 'beep.wav',
    },
  },
};

export default config;
