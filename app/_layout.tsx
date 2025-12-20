import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* LGU / Web Dashboard */}
      <Stack.Screen name="index" />

      {/* Mobile Tabs */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
