# FlipPilot mobile

React Native (Expo, TypeScript). One codebase runs on iOS, Android and the web.
Design: shadcn/ui neutral tokens, Geist, light theme by default (see the Design canvas, page "v2").

## Run

```bash
npm install
npm start          # Expo dev server (press w for web, or scan the QR in Expo Go)
npm run web        # web only
npm run typecheck
```

## Publish the web version

```bash
npm run build:web  # static site in ./dist
```

Upload `dist/` to any static host. The app uses client-side routes, so the host must serve
`index.html` for unknown paths: `public/_redirects` (Netlify, Cloudflare Pages) and `vercel.json`
(Vercel) already do that and are copied into `dist/` by the build.
Without it, opening a deep link such as `/Tabs/Analyze` directly returns 404.

## Backend

All data goes through `src/api/index.ts` (`FlipPilotApi`). Types in `src/api/types.ts` mirror
`backend/internal/domain` and `backend/internal/analysis` (`Result`, `Case`, `DealRules`, ...).

- Without configuration the app uses an in-memory mock (`src/api/mock.ts`) with the demo listings.
- Set `EXPO_PUBLIC_API_URL=https://your-api` (at build time) to use the HTTP client instead.

The mock's calculations are only a stand-in: the real engine lives in the Go backend, the app does
not duplicate it. Proposed REST contract (change paths in `createHttpApi` to match the real handlers):

| Method | Path | Body / result |
| --- | --- | --- |
| GET, PUT | `/v1/settings` | `Settings` |
| GET, PUT | `/v1/deal-rules` | `DealRules` |
| POST | `/v1/analyze` | `Vehicle` -> `Result` |
| GET | `/v1/portfolio` | `Item[]` (`{vehicle, result}`) |
| GET | `/v1/deals` | `{matches: Item[], excluded: (Item & {reasons})[]}` |
| GET | `/v1/watchlist` | `string[]` vehicle ids |
| POST | `/v1/watchlist/:id/toggle` | `string[]` |
| POST | `/v1/analyses` | `Vehicle` |
| GET | `/v1/market` | `Record<model, Record<country, price>>` |

For a browser build the API must allow CORS from the site origin.
