# Freelance Email AI Assistant - Chrome Extension

A Chrome extension that integrates with Gmail to capture emails and generate AI-powered professional responses using the Freelance Flow API.

## Features

- **Gmail Integration**: Adds a "Generate Response" button directly in Gmail's email view
- **AI-Powered Responses**: Generates 3 response variants (Professional, Casual, Formal)
- **Real-time Streaming**: See responses as they're generated with SSE streaming
- **Copy to Clipboard**: One-click copy for generated responses
- **Edit Before Sending**: Modify responses before using them
- **Secure Authentication**: Login with your Freelance Flow account
- **Customizable Settings**: Configure default tones and context preferences

## Installation

### Development Installation (Unpacked Extension)

1. **Download the extension files**
   - Clone or download the `extension` folder to your computer

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `extension` folder

5. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Click the pin icon next to "Freelance Email AI"

## Configuration

### First-Time Setup

1. Click the extension icon in Chrome toolbar
2. Sign in with your Freelance Flow account credentials
3. Open an email in Gmail
4. Click "Generate Response" to start

### Settings

Access settings by:
- Clicking the gear icon in the extension popup
- Or right-click extension icon → Options

Available settings:
- **API Endpoint URL**: Custom API endpoint (advanced users only)
- **Default Tone**: Preferred tone for responses
- **Number of Variants**: How many response options to generate (1-3)
- **Default Context**: Pre-fill urgency, relationship stage, etc.

## Usage

1. **Open an email** in Gmail (single message view)
2. **Click "Generate Response"** button (appears near Reply/Forward)
3. **Wait for AI** to generate 3 response variants
4. **Review responses** and click "Copy" on your preferred one
5. **Paste** into Gmail's compose window

### Tips

- **Edit responses**: Click "Edit" to modify a response before copying
- **Thread context**: The extension captures previous emails in the thread for better responses
- **Keyboard shortcut**: Coming soon!

## Troubleshooting

### "Generate Response" button not appearing
- Refresh the Gmail page
- Make sure you have an email open (not just the inbox)
- Check if the extension is enabled in `chrome://extensions/`

### "Not authenticated" error
- Click the extension icon and sign in again
- Your session may have expired

### "API connection failed"
- Check your internet connection
- Go to Settings → Test Connection
- Verify the API endpoint URL is correct

### Responses not generating
- Check if you've exceeded your monthly response limit
- Try signing out and back in
- Check browser console for errors (F12 → Console)

## File Structure

```
extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker for API calls
├── content.js         # Gmail page injection script
├── content.css        # Styles for injected button
├── popup.html         # Main popup interface
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── options.html       # Settings page
├── options.css        # Settings styles
├── options.js         # Settings logic
├── assets/
│   ├── icon-16.png    # Extension icon (16x16)
│   ├── icon-48.png    # Extension icon (48x48)
│   └── icon-128.png   # Extension icon (128x128)
└── README.md          # This file
```

## API Integration

The extension connects to:
- **Default**: `https://api.freelance-flow.com`
- **Endpoint**: `POST /api/responses/stream`

Request format:
```json
{
  "originalMessage": "Email content with metadata",
  "context": {
    "relationshipStage": "ongoing",
    "projectPhase": "active",
    "urgency": "medium",
    "messageType": "request"
  }
}
```

## Privacy & Security

- Credentials are stored securely in Chrome's sync storage
- All API communication uses HTTPS
- Email content is only sent when you click "Generate Response"
- No email data is stored permanently by the extension

## Requirements

- Google Chrome (version 88 or later)
- Active Freelance Flow account
- Gmail web interface (mail.google.com)

## Support

For issues or feedback:
- Check the [troubleshooting guide](#troubleshooting) above
- Contact support at support@freelance-flow.com

## Version History

### v1.0.0
- Initial release
- Gmail button injection
- SSE streaming responses
- 3 response variants
- Settings page
- Login/logout flow

---

Made with AI for Freelancers
