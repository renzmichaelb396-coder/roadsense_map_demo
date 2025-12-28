# RoadSense PH — LGU Demo Runbook (v2)

## Preconditions
- Repo root: /Users/.../Projects/roadsense-mvp
- Android device or emulator connected
- Correct Supabase env loaded

## Start
1. cd roadsense-mvp
2. npm install
3. npx expo start --clear

## Demo Flow
1. Map loads with LGU markers
2. Long-press → center-pin placement
3. Select severity + type → CONFIRM
4. Marker appears
5. Tap marker → Resolve
6. Toggle Resolved OFF → marker hides
7. Toggle Resolved ON → marker returns (historical)

## Do NOT
- Edit locked files
- Run from /Projects root
- Use tap-to-place (long-press only)

Status: READY
