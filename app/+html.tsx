import { Html, Head, Main, NextScript } from 'expo-router/html';

export default function Root() {
  return (
    <Html>
      <Head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </Head>
      <Main />
      <NextScript />
    </Html>
  );
}
