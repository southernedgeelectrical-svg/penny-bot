# Penny Empire 💰

A tap-to-earn idle tycoon game for iOS (and Android), built with Expo / React Native.

You start with **$0**. Tap the coin to earn cash, buy upgrades, and grow an empire.

## How the game works

| Feature | What it does |
| --- | --- |
| **Tapping** | Each tap earns your "per tap" amount. Starts at $1. |
| **Tap Power upgrades** | 5 upgrades (Quick Fingers → Midas Touch) that add to every tap. |
| **Businesses** | 9 businesses (Lemonade Stand → Asteroid Mining) that earn money every second, even when you aren't tapping. |
| **Enhancing upgrades** | Upgrades can be upgraded too. At levels 10, 25, 50, 100, 150… an upgrade unlocks a ★ Enhance that **doubles its output**. Up to 11 stars per upgrade. |
| **Buy ×1 / ×10 / MAX** | Buy levels in bulk. |
| **Cash Out (prestige)** | After earning $1M in a run, sell everything for **gold bars**. You restart from $0, but every gold bar permanently adds +10% to all income. |
| **Offline earnings** | Businesses keep earning at 50% speed while the app is closed (up to 3 hours). |
| **Coin ranks** | Your coin changes metal as you earn: Copper Penny → Silver Dollar → Gold Coin → Platinum → Diamond. Cashing out starts you back at a penny. |
| **Autosave** | Progress saves to the device every 5 seconds and when the app is closed. |

All tuning numbers (prices, outputs, star levels, prestige rate) live in
[`src/game/definitions.ts`](src/game/definitions.ts). Change them there to rebalance the game.

## Graphics

- Everything is drawn in code (SVG + gradients), so it stays sharp on every screen with no image files to manage.
- The tap coin is a minted coin with a ridged rim, embossed `$` and a glossy shine. It has rotating light rays behind it, a gentle "breathing" pulse, mini coins bursting from your finger on every tap, and a flash of light when it upgrades to a new metal.
- Upgrade icons sit in badges that change color as they earn stars (bronze, silver, gold, ice, amethyst, ruby), with a progress bar toward the next star.
- Chunky 3D buttons squish when pressed; affordable enhancements shimmer.
- Fonts: Lilita One (headings and numbers) and Nunito (text), both free Google Fonts bundled with the app.
- Colors live in `src/theme.ts`, coin metals in `src/components/CoinArt.tsx`.

## Project layout

```
App.tsx                      Main screen: balance, coin, tabs, lists
src/game/definitions.ts      Every upgrade, business, and balancing constant
src/game/economy.ts          Game rules (pure functions, no UI)
src/game/useGame.ts          React state, game loop, autosave, offline earnings
src/game/storage.ts          Saving/loading on the device
src/game/format.ts           $1.23K / $4.56M number formatting
src/game/ranks.ts            Coin metal ranks
src/components/              Coin art, tap effects, buttons, upgrade card, cash-out panel
src/theme.ts                 Colors, gradients, fonts
src/game/__tests__/          Unit tests for the game rules
```

## Running it

```bash
cd penny-empire
npm install
npx expo start          # scan the QR code with the Expo Go app on your iPhone
npm test                # run game-rule tests
npm run typecheck
npx expo lint
```

## Publishing to the App Store

You don't need a Mac. Expo's EAS service builds and uploads the iOS app in the cloud.

1. Join the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. In `app.json`, change `ios.bundleIdentifier` and `android.package` from
   `com.yourcompany.pennyempire` to your own reverse-domain ID (it must be unique on the App Store).
3. Create a free Expo account, then:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios
   ```
   EAS will walk you through creating the signing certificates with your Apple account.
4. In [App Store Connect](https://appstoreconnect.apple.com), add screenshots, a description,
   a privacy policy URL, and the age rating, then submit for review.
   - Privacy: the game collects no data (everything is stored on the device).

Before submitting, check that the name "Penny Empire" isn't already taken on the App Store, and rename it in `app.json` if needed.
