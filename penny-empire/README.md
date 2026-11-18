# Penny Empire 💰

A tap-to-earn idle tycoon game for **Android phones and tablets** (it can also be built for iPhone later), built with Expo / React Native.

On tablets and in landscape, the coin sits on the left and the shop on the right.

You start with **$0**. Tap the coin to earn cash, buy upgrades, and grow an empire.

## How the game works

| Feature | What it does |
| --- | --- |
| **Tapping** | Each tap earns your "per tap" amount. Starts at $1. |
| **Tap Power upgrades** | 7 upgrades (Quick Fingers → Star Forge) that add to every tap. |
| **Businesses** | 12 businesses (Lemonade Stand → Galactic Bank) that earn money every second, even when you aren't tapping. |
| **Enhancing upgrades** | Upgrades can be upgraded too. At levels 10, 25, 50, 100, 150… an upgrade unlocks a ★ Enhance that **doubles its output**. Up to 11 stars per upgrade. |
| **Buy ×1 / ×10 / MAX** | Buy levels in bulk. |
| **Invest → Deals** | Timed ventures (Garage Sale Flip → Treasure Expedition). Pay up front, wait 1–20 minutes, then collect. Safe deals pay ×1.3; long shots pay up to ×10 but can fall through (you get 30% back). Three offers at a time, refreshed every 10 minutes. Unlocks after $2,500 earned. |
| **Invest → Markets** | Savings Bonds, Property Fund, Blue-Chip Stocks and Crypto Coin, with live prices and 10-minute charts. Riskier assets grow faster on average but swing harder. Buy 10% / 50% of your cash, sell everything at once. |
| **Goals → Achievements** | 22 goals (taps, earnings, stars, deals, trades…). Claim each one for **+2% income forever**. |
| **Goals → Daily bonus** | Claim once a day. Rewards grow over a 7-day streak, with a jackpot on day 7. Missing a day restarts the streak. |
| **Cash Out (prestige)** | After earning $1M in a run, sell everything for **gold bars**. You restart from $0, but every gold bar permanently adds +10% to all income. Achievements and your streak carry over. |
| **Coin ranks** | Your coin changes metal as you earn: Copper Penny → Silver Dollar → Gold Coin → Platinum → Diamond. |
| **Offline earnings** | Businesses keep earning at 50% speed while the app is closed (up to 3 hours). Markets and deals keep running too. |
| **Smooth feel** | The balance counts up smoothly, red badges show which tabs have something to buy or claim, and a 5-step "How to play" guide opens for new players (tap **?** to see it again). |
| **Autosave** | Progress saves to the device every 5 seconds and when the app is closed. Saves from older versions upgrade automatically. |

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
src/game/economy.ts          Core rules: costs, income, tapping, buying, stars
src/game/market.ts           Markets: assets, price simulation, buy/sell
src/game/deals.ts            Deals: offers, timed ventures, payouts
src/game/achievements.ts     Achievement list and claiming
src/game/daily.ts            Daily login bonus and streak
src/game/game.ts             Ties it together: ticks, offline time, cash out, loading old saves
src/game/useGame.ts          React state, game loop, autosave, offline earnings
src/game/storage.ts          Saving/loading on the device
src/game/format.ts           $1.23K / $4.56M number formatting
src/game/ranks.ts            Coin metal ranks
src/components/              Coin art, tap effects, buttons, cards, Invest/Goals/Cash Out screens, popups
src/theme.ts                 Colors, gradients, fonts
src/game/__tests__/          Unit tests for the game rules
```

## Running it (for development)

```bash
cd penny-empire
npm install
npx expo start          # scan the QR code with the Expo Go app on your Android phone/tablet
npm test                # run game-rule tests
npm run typecheck
npx expo lint
```

## Installing it on your Android tablet (APK)

Expo's free EAS service builds the Android app in the cloud. You don't need Android Studio.

1. Create a free account at [expo.dev](https://expo.dev).
2. From the `penny-empire` folder:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build --platform android --profile preview
   ```
3. When the build finishes (about 10–20 minutes), EAS gives you a link and a QR code.
   Open it on your tablet, download the `.apk`, and tap it to install.
   Android will ask you to allow installing apps from your browser the first time.

## Publishing to Google Play

1. Build the Play Store version (an `.aab` bundle):
   ```bash
   npx eas-cli@latest build --platform android --profile production
   ```
2. In the [Google Play Console](https://play.google.com/console), click **Create app**, name it, and choose **Game**, **Free**.
3. The first upload must be done by hand: go to **Testing → Internal testing → Create release** and upload the `.aab` from step 1.
   (Later releases can be uploaded with `npx eas-cli@latest submit --platform android` once a Google service account key is set up.)
4. Complete the store listing: description, the 512×512 icon, a 1024×500 feature graphic, and phone **and tablet** screenshots.
5. Complete **App content**:
   - Privacy policy URL (required, even though the game collects no data).
   - Data safety: no data collected or shared (progress is stored only on the device).
   - Ads: none. Content rating questionnaire: a casual game with simulated money and no real gambling.
   - Target audience: choose 13+ unless you want to meet the extra rules for children's apps.
6. New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before going to Production. Organization accounts can skip this.
7. Promote the release to **Production** and submit for review.

The package name is `com.southernedgeelectrical.pennyempire` (in `app.json`).
**It can never be changed after the first upload to Google Play**, so change it now if you want a different one.
Bump `version` in `app.json` for each release; `versionCode` is increased automatically by the production build profile.

## Building for iPhone later (optional)

The same code also builds for iPhone and iPad if you ever get an Apple developer account:
`npx eas-cli@latest build --platform ios` then `npx eas-cli@latest submit --platform ios`.
