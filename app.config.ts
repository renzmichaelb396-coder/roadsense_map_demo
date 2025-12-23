import 'dotenv/config';

export default {
  expo: {
    name: 'RoadSense PH',
    slug: 'roadsense-mvp',
    scheme: 'roadsense',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.rbbrenz.roadsensemvp',
      config: {
        googleMaps: {
          apiKey: 'AIzaSyAfJsplsC9fNO4MnBBu8BdhAzKlMi20ZZw',
        },
      },
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    },
  },
};
