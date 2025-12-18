# Chrome Extension Feasibility Study & Implementation Plan

## Executive Summary

This document outlines the technical feasibility of building a Chrome extension for FreelanceFlow that operates "within the flow" of Gmail, Slack, and LinkedIn. The existing Next.js + Supabase architecture is **well-suited** for extension integration.

---

## Feasibility Assessment

### Overall Verdict: **FEASIBLE**

The existing architecture provides excellent building blocks:
- Type-safe tRPC API (easily callable from extension)
- Token-based auth already exists (streaming API uses Bearer tokens)
- Shared types package (`@freelance-flow/shared`)
- Supabase client works in browser extension contexts
- Services are modular and reusable

---

## Architecture Approach

### Option A: Lightweight Extension (Recommended)

**Concept:** Extension acts as a thin UI layer that calls existing web app APIs.

```
┌─────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                      │
├─────────────────────────────────────────────────────────┤
│  Content Scripts        │  Popup/Side Panel             │
│  - Gmail detector       │  - Auth UI (login form)       │
│  - Slack detector       │  - Quick generate form        │
│  - LinkedIn detector    │  - Response history view      │
│  - "Generate" button    │  - Settings                   │
│    injection            │                               │
├─────────────────────────────────────────────────────────┤
│                   Background Service Worker              │
│  - Auth token management                                 │
│  - API request handling                                  │
│  - Cross-tab state sync                                  │
└─────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS API Calls
                              ▼
┌─────────────────────────────────────────────────────────┐
│              EXISTING FREELANCEFLOW WEB APP              │
├─────────────────────────────────────────────────────────┤
│  /api/responses/stream.ts  │  /api/trpc/*               │
│  (Already has Bearer auth) │  (Add Bearer auth support) │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                     │
│  - User data (synced)                                    │
│  - Response history (synced)                             │
│  - Client contexts (synced)                              │
└─────────────────────────────────────────────────────────┘
```

### Option B: Standalone Extension with Static Export

**Concept:** Export Next.js as static files, embed in extension.

**Pros:** Works offline, faster UI
**Cons:** Complex build pipeline, code duplication, larger extension size

**Verdict:** Not recommended for initial version.

---

## Platform Detection Strategy

### Gmail Detection

```javascript
// Content script: gmail-detector.js
const GMAIL_SELECTORS = {
  composeWindow: 'div[role="dialog"][aria-label*="Compose"]',
  replyBox: 'div[aria-label*="Reply"]',
  messageBody: 'div[aria-label="Message Body"]',
  toField: 'input[aria-label="To"]',
  subjectField: 'input[name="subjectbox"]',
  sendButton: 'div[aria-label*="Send"]'
};

// URL pattern match in manifest.json
"matches": ["https://mail.google.com/*"]
```

**Injection Points:**
1. Floating button near compose/reply box
2. Context menu on selected text
3. Keyboard shortcut (Ctrl+Shift+G)

### Slack Detection

```javascript
// Content script: slack-detector.js
const SLACK_SELECTORS = {
  messageInput: 'div[data-qa="message_input"]',
  messageContainer: 'div.c-message_kit__text',
  channelHeader: 'button[data-qa="channel_header_title"]',
  threadView: 'div[data-qa="thread_messages"]'
};

// URL patterns
"matches": [
  "https://app.slack.com/*",
  "https://*.slack.com/*"
]
```

**Injection Points:**
1. Button in message input toolbar
2. Context menu on received messages
3. Thread panel integration

### LinkedIn Detection

```javascript
// Content script: linkedin-detector.js
const LINKEDIN_SELECTORS = {
  messageInput: 'div.msg-form__contenteditable',
  messageThread: 'ul.msg-s-message-list-content',
  conversationHeader: 'h2.msg-entity-lockup__entity-title',
  sendButton: 'button.msg-form__send-button'
};

// URL patterns
"matches": [
  "https://www.linkedin.com/messaging/*",
  "https://www.linkedin.com/in/*"
]
```

---

## Extension File Structure

```
chrome-extension/
├── manifest.json              # Manifest V3 configuration
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background service worker
│   ├── content-scripts/
│   │   ├── gmail.ts           # Gmail content script
│   │   ├── slack.ts           # Slack content script
│   │   ├── linkedin.ts        # LinkedIn content script
│   │   └── shared/
│   │       ├── injector.ts    # Button/UI injection logic
│   │       └── extractor.ts   # Message text extraction
│   ├── popup/
│   │   ├── index.html
│   │   ├── popup.tsx          # React popup UI
│   │   └── styles.css
│   ├── sidepanel/             # Optional side panel UI
│   │   ├── index.html
│   │   └── panel.tsx
│   ├── lib/
│   │   ├── api.ts             # FreelanceFlow API client
│   │   ├── auth.ts            # Token management
│   │   └── storage.ts         # Chrome storage wrapper
│   └── types/
│       └── index.ts           # Shared types (from @freelance-flow/shared)
├── public/
│   └── icons/                 # Extension icons
├── package.json
├── tsconfig.json
├── vite.config.ts             # or webpack.config.js
└── README.md
```

---

## Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "FreelanceFlow - AI Email Assistant",
  "version": "1.0.0",
  "description": "Generate professional email responses powered by AI",

  "permissions": [
    "storage",
    "activeTab",
    "contextMenus"
  ],

  "host_permissions": [
    "https://mail.google.com/*",
    "https://app.slack.com/*",
    "https://*.slack.com/*",
    "https://www.linkedin.com/*",
    "https://your-app-domain.com/*"
  ],

  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": ["content-scripts/gmail.js"],
      "css": ["content-scripts/styles.css"]
    },
    {
      "matches": ["https://app.slack.com/*", "https://*.slack.com/*"],
      "js": ["content-scripts/slack.js"],
      "css": ["content-scripts/styles.css"]
    },
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["content-scripts/linkedin.js"],
      "css": ["content-scripts/styles.css"]
    }
  ],

  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "side_panel": {
    "default_path": "sidepanel/index.html"
  },

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## Authentication Strategy

### Approach: OAuth-like Token Flow

1. **Initial Login:**
   - User clicks extension popup
   - Opens FreelanceFlow login page (web app)
   - After successful login, web app sends token to extension via messaging

2. **Token Storage:**
   - Store access token in `chrome.storage.local` (encrypted)
   - Store refresh token securely
   - Background worker manages token refresh

3. **API Authentication:**
   - All API calls include `Authorization: Bearer <token>` header
   - Leverage existing streaming API pattern (already supports Bearer tokens)

### Required Backend Changes

**Minimal changes to existing API:**

```typescript
// Add to /server/routers/context.ts
// Check for Bearer token in Authorization header (for extension)
const authHeader = req.headers.authorization;
if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.slice(7);
  const { data: { user } } = await supabase.auth.getUser(token);
  // ... rest of context creation
}
```

**Existing streaming API already does this:**
```typescript
// /pages/api/responses/stream.ts (lines 25-40)
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Authorization required' });
}
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);
```

---

## API Integration Layer

### Extension API Client

```typescript
// lib/api.ts - Calls existing FreelanceFlow backend
class FreelanceFlowAPI {
  private baseUrl: string;
  private getToken: () => Promise<string>;

  constructor(baseUrl: string, getToken: () => Promise<string>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  async generateResponse(params: {
    originalMessage: string;
    clientId?: string;
    projectId?: string;
    messageType?: string;
    platform: 'gmail' | 'slack' | 'linkedin';
  }): Promise<GeneratedResponse[]> {
    const token = await this.getToken();

    // Use streaming endpoint for real-time generation
    const response = await fetch(`${this.baseUrl}/api/responses/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_message: params.originalMessage,
        client_id: params.clientId,
        project_id: params.projectId,
        message_type: params.messageType,
        context: { platform: params.platform }
      }),
    });

    // Handle streaming response
    return this.parseStreamingResponse(response);
  }

  async getClients(): Promise<Client[]> {
    // Call tRPC endpoint
  }

  async getProjects(clientId: string): Promise<Project[]> {
    // Call tRPC endpoint
  }
}
```

---

## UI/UX Flow

### Gmail Integration Flow

```
1. User opens Gmail, clicks reply on an email
   ↓
2. Content script detects reply box, injects "Generate with FreelanceFlow" button
   ↓
3. User clicks button
   ↓
4. Extension extracts:
   - Email thread content
   - Sender's email address
   - Subject line
   ↓
5. Side panel or popup opens with:
   - Extracted message preview
   - Client selector (auto-matched if email matches a client)
   - Project selector
   - Message type (response/scope_change/etc)
   ↓
6. User clicks "Generate"
   ↓
7. Loading state with streaming progress
   ↓
8. 2-3 response options displayed
   ↓
9. User selects preferred response
   ↓
10. Response inserted into Gmail reply box
    ↓
11. User can edit and send via Gmail
```

---

## Data Sync Strategy

### What Gets Synced (via existing Supabase backend):

| Data | Direction | Mechanism |
|------|-----------|-----------|
| Response History | Web ↔ Extension | Direct API calls to same backend |
| Clients | Web ↔ Extension | Same database, same API |
| Projects | Web ↔ Extension | Same database, same API |
| User Preferences | Web ↔ Extension | Same database, same API |
| Style Profile | Web → Extension | Read-only from extension |

### Local Extension Storage:

| Data | Purpose |
|------|---------|
| Auth tokens | Quick access, secure storage |
| Recent clients | Offline dropdown population |
| Last used settings | Remember user preferences |
| Draft responses | Preserve work if user closes popup |

---

## Implementation Phases

### Phase 1: Foundation (Core Extension Setup)
- [ ] Set up extension project with Manifest V3
- [ ] Create build pipeline (Vite/Webpack + TypeScript)
- [ ] Implement authentication flow (login via web app, token storage)
- [ ] Create basic popup UI for login/status
- [ ] Add API client for calling existing endpoints
- [ ] Test token-based auth with streaming endpoint

### Phase 2: Gmail Integration
- [ ] Gmail content script with DOM detection
- [ ] "Generate" button injection near compose/reply
- [ ] Message extraction (thread content, sender info)
- [ ] Client auto-detection from email address
- [ ] Response generation UI (popup or side panel)
- [ ] Insert generated response into Gmail compose box

### Phase 3: Response Experience
- [ ] Streaming response display with loading states
- [ ] Multiple response options with tone indicators
- [ ] One-click insertion into compose box
- [ ] Save to history (automatically via existing API)
- [ ] Quick edit before insertion

### Phase 4: Slack Integration
- [ ] Slack content script
- [ ] Button injection in message input area
- [ ] Message context extraction
- [ ] Integration with Slack's rich text editor

### Phase 5: LinkedIn Integration
- [ ] LinkedIn content script
- [ ] Messaging panel detection
- [ ] Button injection
- [ ] Response insertion into LinkedIn composer

### Phase 6: Polish & Advanced Features
- [ ] Context menu integration (right-click on text)
- [ ] Keyboard shortcuts
- [ ] Offline graceful degradation
- [ ] Usage limit warnings
- [ ] Premium feature gating
- [ ] Settings sync with web app

---

## Required Backend Modifications

### Minimal Changes Required:

1. **Add Bearer Token Support to tRPC Context** (if not already present)
   - File: `/server/routers/context.ts`
   - Change: Check Authorization header as fallback to cookies
   - Impact: ~10 lines of code

2. **Add Extension Tracking to Response History**
   - File: `/server/routers/responses.ts`
   - Change: Accept `platform` field in context
   - Impact: ~5 lines of code

3. **CORS Configuration for Extension**
   - File: `/next.config.mjs`
   - Change: Add extension ID to allowed origins
   - Impact: ~3 lines of code

4. **Optional: Extension-Specific Endpoints**
   - Lightweight endpoint for quick client lookup by email
   - Batch endpoint for prefetching dropdowns
   - Impact: Optional optimization

---

## Technical Challenges & Mitigations

### Challenge 1: Platform DOM Changes
**Risk:** Gmail/Slack/LinkedIn update their DOM structure, breaking selectors.
**Mitigation:**
- Use multiple fallback selectors
- Implement selector versioning
- Add automated DOM change detection
- Ship quick updates via Chrome Web Store

### Challenge 2: Content Security Policy
**Risk:** Some sites restrict injected scripts.
**Mitigation:**
- Use Manifest V3's isolated world for content scripts
- Communicate via `window.postMessage` if needed
- Use Chrome's side panel instead of injecting complex UI

### Challenge 3: Token Security
**Risk:** Storing auth tokens in extension storage.
**Mitigation:**
- Use `chrome.storage.local` with encryption
- Implement short-lived access tokens with refresh
- Clear tokens on extension uninstall

### Challenge 4: Rate Limiting
**Risk:** Extension users hitting API rate limits.
**Mitigation:**
- Reuse existing rate limiting from web app
- Add extension-specific throttling in background worker
- Queue requests during high usage

---

## Estimated Complexity

| Component | Effort | Dependencies |
|-----------|--------|--------------|
| Extension scaffold + build | Low | None |
| Auth flow | Medium | Backend token support |
| Gmail integration | Medium | DOM selectors research |
| Popup/Side panel UI | Low | Existing components can be adapted |
| API client | Low | Existing endpoints |
| Slack integration | Medium | DOM selectors research |
| LinkedIn integration | Medium | DOM selectors research |
| Testing & QA | High | All of the above |

---

## Open Questions for User

1. **Priority of platforms:** Gmail first, then Slack, then LinkedIn? Or different order?

2. **UI preference:** Popup window vs. Side Panel vs. Floating widget?

3. **Free tier support:** Should extension work for free tier users (with limits)?

4. **Standalone login:** Should extension have its own login form, or always redirect to web app?

5. **Offline mode:** Any offline functionality needed, or always require connection?

---

## Conclusion

Building a Chrome extension for FreelanceFlow is **highly feasible** with the current architecture. The key advantages:

1. **Existing API infrastructure** - Token-based streaming API already exists
2. **Shared types** - `@freelance-flow/shared` package eliminates duplication
3. **Same backend** - No new backend deployment needed
4. **Supabase compatibility** - Auth tokens work seamlessly
5. **Modular services** - AI generation logic stays on server

The recommended approach is a **lightweight extension** that acts as a UI layer calling existing APIs, starting with Gmail integration as the MVP.

---

## Review Section

### Summary of Research
- Explored full codebase architecture including auth, API, and data patterns
- Identified existing Bearer token auth in streaming endpoint (can be reused)
- Confirmed Supabase client compatibility with Chrome extensions
- Mapped out content script requirements for Gmail, Slack, and LinkedIn
- Designed minimal backend changes (~15-20 lines total)

### Key Findings
1. The streaming API (`/api/responses/stream.ts`) already supports Bearer token auth - this is the primary integration point
2. tRPC endpoints need minor modification to support Authorization header alongside cookies
3. The `@freelance-flow/shared` package provides all necessary types
4. Manifest V3 is required (V2 is deprecated) - this affects service worker patterns

### Recommendations
1. Start with Gmail integration only (highest value, most common use case)
2. Use Side Panel UI for better user experience
3. Minimize backend changes - leverage existing infrastructure
4. Plan for Chrome Web Store review process (2-5 days typical)

### Next Steps (When Ready to Implement)
1. Create extension project in `/chrome-extension` directory
2. Add ~15 lines of Bearer token support to tRPC context
3. Build Gmail content script with button injection
4. Create popup/side panel React app
5. Test end-to-end flow
6. Add Slack and LinkedIn in subsequent releases
