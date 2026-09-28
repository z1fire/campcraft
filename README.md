# 🏕️ CampCraft: Wilderness Adventure

An educational camping simulator for Android phones and tablets, built from
[`CampCraft_Wilderness_Adventure_Game_Design.md`](CampCraft_Wilderness_Adventure_Game_Design.md).

Plan trips, check the forecast, shop on a budget, pack a backpack, pick a tent site,
pitch the tent, build and safely put out fires, cook, purify water, fish, explore with a
compass, watch wildlife, build shelters and bridges — and see what happens at night.
The game teaches mostly through visuals and consequences, with very little reading.

## 📲 Install on Android

1. Open the **[Releases](../../releases/latest)** page on your phone or tablet.
2. Download **CampCraft.apk**.
3. Open it and allow "Install unknown apps" if Android asks.

Every push to `main` builds a new signed APK with GitHub Actions and publishes it as a release.

## 🎮 What's in the game

| System | Highlights |
|---|---|
| 7 trips | Backyard → Campground → Lake → Forest → Mountain → River → Wilderness |
| Store & budget | $ budget, needs vs. wants, prices, weight and space |
| Packing | 16-cell backpack grid, weight limit, forecast shown while packing |
| Campsite | Choose flat/dry/safe ground; hollows flood, slopes slide, snags fall |
| Tent | Clear, tarp, tent, poles, stakes, rain fly, guy lines |
| Fire | Tinder → kindling → sticks → logs; heat/fuel/air; wet wood; douse–stir–check |
| Water | Faucet vs. lake/stream; filter, tablets (wait), boiling |
| Cooking | RAW → SAFE → BURNT meter, flipping, coals vs. flames, dishes |
| Fishing | Bait, depth, casting, bites, line tension; 5 species; keep or release |
| Explore | Compass directions, trail map, missions, landmarks, sneaking up on wildlife, tracks, gathering wood |
| Build | Tarp shelter, wood rack, cooking tripod, food hang, creek bridge |
| Night | Rain, wind, storms, cold, raccoons, embers — outcomes depend on preparation |
| Progress | Badges, 10 skills, field guide, cosmetics, Nature/Safety/Food/Comfort stars |
| Accessibility | Text size, reduced motion, high contrast, sound captions, read-aloud, simple controls |

## 🛠️ Develop

The game is plain HTML5 canvas + JavaScript modules in `www/` (no build step), wrapped with Capacitor.

```bash
npm install
npm run serve          # play in a browser at http://localhost:8080
npx cap sync android   # copy www/ into the Android project
npx cap open android   # open in Android Studio
```

## 🔑 Signing

Release APKs are signed with a key stored in the repository secrets
`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
Without them the workflow builds a debug APK instead.
