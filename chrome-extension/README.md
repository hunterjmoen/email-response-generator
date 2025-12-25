# FreelanceFlow Gmail Extension

Chrome extension that integrates FreelanceFlow directly into Gmail.

## Features

- **Client Context Lookup** - See client info (relationship stage, health score) when viewing emails
- **Scope Creep Detection** - Automatically flag emails that may contain scope creep
- **AI Response Generation** - Generate professional replies using FreelanceFlow's AI
- **New Client Creation** - Add unknown email senders as clients with one click

## Development Setup

### Prerequisites

- Node.js 18+
- npm 10+
- FreelanceFlow backend running (localhost:3000 or production URL)

### Installation

```bash
cd chrome-extension
npm install
```

### Configuration

Update `src/shared/constants.ts` with your configuration:

```typescript
export const API_BASE_URL = 'http://localhost:3000'; // or your production URL
```

### Build

```bash
# Development build with watch
npm run dev

# Production build
npm run build
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension/dist` folder

## Architecture

```
chrome-extension/
├── src/
│   ├── background/       # Service worker for auth & API
│   ├── content/          # Gmail integration scripts
│   ├── popup/            # Extension popup (login UI)
│   ├── sidebar/          # Gmail sidebar React app
│   └── shared/           # Shared utilities & types
├── manifest.json         # Extension manifest (v3)
└── webpack.config.js     # Build configuration
```

## How It Works

1. **Authentication**: Users log in via the extension popup. JWT tokens are stored in `chrome.storage.local`.

2. **Gmail Detection**: Content scripts detect when emails are opened and extract sender/subject/body.

3. **Sidebar**: A React app renders in an iframe alongside Gmail, showing client context and AI tools.

4. **API Communication**: The extension calls FreelanceFlow's tRPC API with Bearer token authentication.

## Backend Requirements

The FreelanceFlow backend needs these changes (already implemented):

1. **Bearer Token Auth** in `/server/trpc.ts` - Supports `Authorization: Bearer <token>` header
2. **getByEmail Endpoint** in `/server/routers/clients.ts` - Looks up clients by email address
3. **CORS Support** in `/pages/api/trpc/[trpc].ts` - Allows `chrome-extension://` origins

## Troubleshooting

### Extension not loading
- Make sure you ran `npm run build` first
- Check Chrome console for errors

### API requests failing
- Verify the API_BASE_URL is correct
- Check that CORS is configured on the backend
- Ensure you're logged in (check popup)

### Gmail detection not working
- Gmail's DOM changes frequently; selectors may need updates
- Check content script console for errors

## Development Tips

- Use `npm run dev` for hot reloading during development
- Test with multiple Gmail accounts
- Chrome DevTools > Extensions > Service Worker to debug background script
