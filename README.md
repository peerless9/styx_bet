# Styx Bet — iPhone app (Expo)

Native iPhone version of Styx Bet. It uses the same Firebase database as the web app, so bets,
users and the ledger are shared between both.

## Run it on your iPhone (about 5 minutes)

You need **Node.js** on your Mac (`node -v` should print v20 or newer) and the free
**Expo Go** app on your iPhone. Keep both on the same Wi-Fi.

```bash
cd styx-mobile
npm install
npx expo start
```

A QR code appears in Terminal. Open the iPhone **Camera** app, point it at the QR code and tap the
banner — Styx opens in Expo Go. Save any file and the app on your phone updates instantly.

- Shake the phone to open the dev menu (reload, etc.).
- If the phone can't connect (school/eduroam Wi-Fi often blocks it), run `npx expo start --tunnel`.
- Press `i` in the Terminal to open the iPhone Simulator instead (needs Xcode installed).

## Trying it out

You start as the demo persona **Alex Rivera**. Tap your avatar (top right) to switch to Samantha,
Jordan or David — e.g. post a bet as Alex against Samantha, switch to Samantha, accept it in the
Inbox, then both vote on the winner. No bets yet? Tap **Load samples** on the Bets tab.

## Project layout

```
src/app/(tabs)/       the 5 tabs: index (Bets), inbox, create (Post), ledger, ranks
src/app/bet/[id].tsx  bet detail sheet: sign & lock, vote, dispute, verdict
src/app/share/[id].tsx share card → iOS share sheet / Save Image
src/app/wallet.tsx, register.tsx, audit.tsx, account.tsx, username.tsx   other sheets
src/services/betService.ts   all bet logic (same as the web app)
src/context/          AuthContext (demo personas), BetsContext (live bets feed)
src/components/ui.tsx shared buttons, cards, inputs, pills
src/constants/theme.ts colors
```

## Getting it on friends' phones (TestFlight)

Needs the Apple Developer Program ($99/yr) and a free Expo account (expo.dev).

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production   # builds in the cloud, no Xcode needed
eas submit --platform ios                        # uploads to App Store Connect → TestFlight
```

Before that, change `ios.bundleIdentifier` in `app.json` (`com.styxbet.app`) to something you own.

## Not done yet

- **Real sign-in (Google / Apple).** Needs a development build, not Expo Go. Until then the app
  uses the demo personas.
- **Push notifications** for new challenges (also needs a development build).
- **Real money.** Balances are play money. Real-money escrow and payouts need gambling /
  money-transmission licensing, and the App Store won't accept it without that.
