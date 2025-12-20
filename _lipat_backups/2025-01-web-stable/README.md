# ROAD SENSE PH — WEB STABLE BASELINE

Date: 2025-01
Status: CONFIRMED STABLE

What works:
- Expo web runs without Metro crashes
- react-native-maps is fully isolated to native platforms
- map.web.tsx shows placeholder only
- map.ios.tsx / map.android.tsx use react-native-maps
- _layout.web.tsx excludes Map tab
- _layout.native.tsx includes Map tab

Rules:
- DO NOT import react-native-maps in any non-native file
- DO NOT remove base _layout.tsx fallback
- Any future changes must be compared against this folder

This snapshot exists to support LIPAT and fast rollback.
