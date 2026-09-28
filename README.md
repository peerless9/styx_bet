# styx_bet

Mobile-first social betting with friends on anything. React + Vite + Firebase.

## Web

```bash
bun install        # or npm install
npm run dev        # http://localhost:3000
```

## iPhone — option 1: home-screen web app (no Mac needed)

Deploy the site (e.g. `npm run build` then `firebase deploy`, Vercel, Netlify), open it in **Safari** on the
iPhone, tap **Share → Add to Home Screen**. It launches full-screen with its own icon, respects the
notch / home bar, and Google sign-in uses the redirect flow that works in home-screen apps.

## iPhone — option 2: native app (Capacitor)

The `ios/` folder is a real Xcode project that wraps the web app. You need a **Mac with Xcode 16.3+**.

**One-time setup**

1. `bun install` (or `npm install`)
2. In `capacitor.config.ts`, change `appId` (`com.styxbet.app`) to your own reverse-domain ID.
3. **Firebase iOS app** (needed for Google sign-in):
   - Firebase console → Project settings → *Add app* → iOS, use the same bundle ID as `appId`.
   - Download `GoogleService-Info.plist` and put it in `ios/App/App/`, then in Xcode drag it into the
     *App* group (tick "Copy items if needed" and the *App* target).
   - Run `npm run ios:google` — copies `REVERSED_CLIENT_ID` into `Info.plist` so the Google sheet can
     return to the app.
4. `npm run ios` — builds the web app, syncs it into `ios/`, and opens Xcode.
5. In Xcode: select the **App** target → *Signing & Capabilities* → pick your Team (a free Apple ID
   works for your own phone). Plug in your iPhone, pick it as the run destination, press ▶.
   First run on a phone: Settings → General → VPN & Device Management → trust your developer profile.

**Every time you change the web code:** `npm run ios:sync` (or `npm run ios`), then ▶ in Xcode.

**Getting it onto friends' phones:** TestFlight, which needs the paid Apple Developer Program
($99/yr). Note that App Store review (guideline 5.3) doesn't allow real-money betting apps from
individual developers without gambling licences, so keep it to TestFlight / demo credits unless
that changes.

### What's iOS-specific in the code

- `src/lib/platform.ts` – detects native app vs. home-screen web app vs. browser; `publicOrigin` makes
  invite links point at the hosted site instead of `capacitor://localhost` (override with `VITE_PUBLIC_URL`).
- `src/lib/firebase.ts` – uses `initializeAuth` with IndexedDB persistence inside the native app
  (plain `getAuth()` hangs in WKWebView).
- `src/context/AuthContext.tsx` – Google sign-in: native sheet in the app, redirect in the home-screen
  app, popup (falling back to redirect) in browsers.
- `src/lib/share.ts` – share card export opens the iOS share sheet (Save Image / Messages) instead of a
  download link, which iOS ignores.
- `src/index.css` + components – safe-area padding for the notch and home indicator, `dvh` modal heights,
  scrollable modals, no zoom-on-focus.
