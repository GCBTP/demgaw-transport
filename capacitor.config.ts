import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'sn.demgaw.transport',
  appName: 'Demgaw Transport',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#00853F',
      showSpinner: false,
    },
  },
}

export default config
