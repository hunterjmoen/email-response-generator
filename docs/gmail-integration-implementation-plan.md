# Gmail Integration Implementation Plan

## Overview
Implement full two-way Gmail integration with OAuth 2.0, allowing users to:
- Auto-link emails to clients
- View client communication history
- Send AI-generated responses directly via Gmail

## Architecture Approach
- **Real-time API calls** (no local email storage/caching)
- **Full Gmail modify access** (read, send, modify labels)
- **OAuth 2.0** using Google APIs
- **Token encryption** for secure credential storage
- **Follows existing Stripe integration pattern**

## User Requirements
Based on user preferences:
1. **Primary Goal**: Both read and send emails
2. **Data Storage**: Real-time API calls only (no caching)
3. **Access Level**: Full modify access (read, send, organize)
4. **Workflow Integration**:
   - Auto-link emails to clients
   - Quick-send generated responses
   - Client communication history

## Implementation Steps

### 1. Environment & Dependencies

**Google Cloud Setup**:
- Create Google Cloud Project
- Enable Gmail API
- Configure OAuth 2.0 consent screen
- Create OAuth 2.0 credentials (Web application)
- Add authorized redirect URIs

**Environment Variables** (add to `.env`):
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/gmail-callback
ENCRYPTION_KEY=your_encryption_key_for_tokens
```

**Dependencies** (add to `package.json`):
```bash
npm install googleapis
npm install crypto-js  # For token encryption if not already present
```

**Gmail API Scopes Required**:
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts
- `https://www.googleapis.com/auth/gmail.modify` - Modify labels/organization
- `https://www.googleapis.com/auth/userinfo.email` - Get user email

### 2. Database Migration (008_add_gmail_integration.sql)

Add Gmail integration columns to `subscriptions` table:

```sql
-- Migration: 008_add_gmail_integration.sql
-- Description: Add Gmail OAuth integration support

-- Add Gmail integration columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN gmail_user_id TEXT UNIQUE,
ADD COLUMN gmail_email TEXT,
ADD COLUMN gmail_refresh_token TEXT, -- Encrypted
ADD COLUMN gmail_token_expires_at TIMESTAMPTZ,
ADD COLUMN gmail_connected_at TIMESTAMPTZ,
ADD COLUMN gmail_sync_enabled BOOLEAN DEFAULT false;

-- Create index on gmail_user_id for faster lookups
CREATE INDEX idx_subscriptions_gmail_user_id ON subscriptions(gmail_user_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.gmail_refresh_token IS 'Encrypted OAuth refresh token for Gmail API access';
```

**Schema Design Rationale**:
- Store in `subscriptions` table (1:1 relationship with user)
- `gmail_refresh_token` is encrypted at rest for security
- `gmail_sync_enabled` allows users to temporarily disable without disconnecting
- No email storage (real-time API calls only)

### 3. Backend Services

#### 3.1 services/gmail.ts - Gmail API Wrapper Service

```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { encrypt, decrypt } from './encryption';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
];

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Generate OAuth URL for user authorization
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Set credentials from encrypted refresh token
  async setCredentialsFromRefreshToken(encryptedRefreshToken: string) {
    const refreshToken = decrypt(encryptedRefreshToken);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Get fresh access token
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);
  }

  // Fetch emails for a specific client email address
  async listClientEmails(clientEmail: string, maxResults: number = 20) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const query = `from:${clientEmail} OR to:${clientEmail}`;
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];

    // Fetch full message details
    const emailDetails = await Promise.all(
      messages.map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });
        return this.parseEmailMessage(detail.data);
      })
    );

    return emailDetails;
  }

  // Parse Gmail message into readable format
  private parseEmailMessage(message: any) {
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      snippet: message.snippet,
      body: this.getEmailBody(message.payload),
    };
  }

  // Extract email body from payload
  private getEmailBody(payload: any): string {
    if (payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      const textPart = payload.parts.find((part: any) =>
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return '';
  }

  // Send email via Gmail
  async sendEmail(to: string, subject: string, body: string, fromEmail?: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return response.data;
  }

  // Create draft email
  async createDraft(to: string, subject: string, body: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedEmail,
        },
      },
    });

    return response.data;
  }

  // Get user's Gmail address
  async getUserEmail() {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress;
  }
}
```

#### 3.2 services/encryption.ts (enhance existing or create)

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 4. tRPC Router (server/routers/gmail.ts)

```typescript
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { GmailService } from '../../services/gmail';
import { encrypt } from '../../services/encryption';

export const gmailRouter = router({
  // Get OAuth authorization URL
  getAuthUrl: protectedProcedure.query(async () => {
    const gmailService = new GmailService();
    const authUrl = gmailService.getAuthUrl();
    return { authUrl };
  }),

  // Handle OAuth callback and store tokens
  handleCallback: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const gmailService = new GmailService();
        const tokens = await gmailService.exchangeCodeForTokens(input.code);

        if (!tokens.refresh_token) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to obtain refresh token from Google',
          });
        }

        // Encrypt refresh token
        const encryptedRefreshToken = encrypt(tokens.refresh_token);

        // Get user's Gmail address
        gmailService.oauth2Client.setCredentials(tokens);
        const gmailEmail = await gmailService.getUserEmail();

        // Store in database
        const { error } = await ctx.supabase
          .from('subscriptions')
          .update({
            gmail_user_id: tokens.access_token, // Use a stable identifier
            gmail_email: gmailEmail,
            gmail_refresh_token: encryptedRefreshToken,
            gmail_token_expires_at: tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : null,
            gmail_connected_at: new Date().toISOString(),
            gmail_sync_enabled: true,
          })
          .eq('user_id', ctx.user.id);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save Gmail credentials',
            cause: error,
          });
        }

        return {
          success: true,
          email: gmailEmail,
          connectedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to connect Gmail account',
          cause: error,
        });
      }
    }),

  // Get Gmail connection status
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('subscriptions')
      .select('gmail_email, gmail_connected_at, gmail_sync_enabled')
      .eq('user_id', ctx.user.id)
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch Gmail status',
        cause: error,
      });
    }

    return {
      isConnected: !!data.gmail_email,
      email: data.gmail_email,
      connectedAt: data.gmail_connected_at,
      syncEnabled: data.gmail_sync_enabled,
    };
  }),

  // List emails for a specific client
  listClientEmails: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      maxResults: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input, ctx }) => {
      // Get client email
      const { data: client, error: clientError } = await ctx.supabase
        .from('clients')
        .select('email, name')
        .eq('id', input.clientId)
        .eq('user_id', ctx.user.id)
        .single();

      if (clientError || !client?.email) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found or has no email',
        });
      }

      // Get Gmail credentials
      const { data: subscription, error: subError } = await ctx.supabase
        .from('subscriptions')
        .select('gmail_refresh_token, gmail_sync_enabled')
        .eq('user_id', ctx.user.id)
        .single();

      if (subError || !subscription?.gmail_refresh_token) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not connected',
        });
      }

      if (!subscription.gmail_sync_enabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail sync is disabled',
        });
      }

      // Fetch emails from Gmail
      try {
        const gmailService = new GmailService();
        await gmailService.setCredentialsFromRefreshToken(subscription.gmail_refresh_token);
        const emails = await gmailService.listClientEmails(client.email, input.maxResults);

        return {
          clientName: client.name,
          clientEmail: client.email,
          emails,
          totalCount: emails.length,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch emails from Gmail',
          cause: error,
        });
      }
    }),

  // Send email via Gmail
  sendEmail: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      clientId: z.string().uuid().optional(), // For tracking
    }))
    .mutation(async ({ input, ctx }) => {
      // Get Gmail credentials
      const { data: subscription, error: subError } = await ctx.supabase
        .from('subscriptions')
        .select('gmail_refresh_token, gmail_sync_enabled')
        .eq('user_id', ctx.user.id)
        .single();

      if (subError || !subscription?.gmail_refresh_token) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not connected',
        });
      }

      if (!subscription.gmail_sync_enabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail sync is disabled',
        });
      }

      // Send email
      try {
        const gmailService = new GmailService();
        await gmailService.setCredentialsFromRefreshToken(subscription.gmail_refresh_token);
        const result = await gmailService.sendEmail(input.to, input.subject, input.body);

        // TODO: Optionally track sent email in response_history or new table

        return {
          success: true,
          messageId: result.id,
          threadId: result.threadId,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send email via Gmail',
          cause: error,
        });
      }
    }),

  // Create draft email
  createDraft: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get Gmail credentials
      const { data: subscription, error: subError } = await ctx.supabase
        .from('subscriptions')
        .select('gmail_refresh_token, gmail_sync_enabled')
        .eq('user_id', ctx.user.id)
        .single();

      if (subError || !subscription?.gmail_refresh_token) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Gmail not connected',
        });
      }

      // Create draft
      try {
        const gmailService = new GmailService();
        await gmailService.setCredentialsFromRefreshToken(subscription.gmail_refresh_token);
        const result = await gmailService.createDraft(input.to, input.subject, input.body);

        return {
          success: true,
          draftId: result.id,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Gmail draft',
          cause: error,
        });
      }
    }),

  // Disconnect Gmail
  disconnectGmail: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('subscriptions')
      .update({
        gmail_user_id: null,
        gmail_email: null,
        gmail_refresh_token: null,
        gmail_token_expires_at: null,
        gmail_connected_at: null,
        gmail_sync_enabled: false,
      })
      .eq('user_id', ctx.user.id);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to disconnect Gmail',
        cause: error,
      });
    }

    return { success: true };
  }),

  // Toggle Gmail sync
  toggleSync: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabase
        .from('subscriptions')
        .update({ gmail_sync_enabled: input.enabled })
        .eq('user_id', ctx.user.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update Gmail sync status',
          cause: error,
        });
      }

      return { success: true, enabled: input.enabled };
    }),
});
```

### 5. Frontend Pages & Components

#### 5.1 pages/settings/integrations.tsx - Gmail Settings Page

```typescript
import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { useRouter } from 'next/router';

export default function IntegrationsPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: gmailStatus, refetch } = trpc.gmail.getConnectionStatus.useQuery();
  const getAuthUrl = trpc.gmail.getAuthUrl.useQuery();
  const disconnectMutation = trpc.gmail.disconnectGmail.useMutation();
  const toggleSyncMutation = trpc.gmail.toggleSync.useMutation();

  const handleConnectGmail = () => {
    if (getAuthUrl.data?.authUrl) {
      setIsConnecting(true);
      window.location.href = getAuthUrl.data.authUrl;
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect Gmail? This will remove all Gmail integration.')) {
      await disconnectMutation.mutateAsync();
      refetch();
    }
  };

  const handleToggleSync = async () => {
    await toggleSyncMutation.mutateAsync({
      enabled: !gmailStatus?.syncEnabled,
    });
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Integrations</h1>

      {/* Gmail Integration Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Gmail Integration</h2>
            <p className="text-gray-600 mb-4">
              Connect your Gmail account to send AI-generated responses and view client communication history.
            </p>

            {gmailStatus?.isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    Connected: <strong>{gmailStatus.email}</strong>
                  </span>
                </div>

                {gmailStatus.connectedAt && (
                  <p className="text-xs text-gray-500">
                    Connected on {new Date(gmailStatus.connectedAt).toLocaleDateString()}
                  </p>
                )}

                <div className="flex items-center space-x-4 mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={gmailStatus.syncEnabled}
                      onChange={handleToggleSync}
                      className="rounded"
                    />
                    <span className="text-sm">Enable Gmail sync</span>
                  </label>
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isLoading}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {disconnectMutation.isLoading ? 'Disconnecting...' : 'Disconnect Gmail'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={isConnecting || !getAuthUrl.data}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Gmail'}
              </button>
            )}
          </div>

          <div className="text-4xl">📧</div>
        </div>
      </div>

      {/* Future integrations placeholder */}
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
        <p className="text-gray-500">More integrations coming soon...</p>
      </div>
    </div>
  );
}
```

#### 5.2 pages/auth/gmail-callback.tsx - OAuth Callback Handler

```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { trpc } from '../../utils/trpc';

export default function GmailCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCallbackMutation = trpc.gmail.handleCallback.useMutation();

  useEffect(() => {
    const handleCallback = async () => {
      const { code, error } = router.query;

      if (error) {
        setStatus('error');
        setErrorMessage(`OAuth error: ${error}`);
        return;
      }

      if (!code || typeof code !== 'string') {
        return; // Wait for router to be ready
      }

      try {
        await handleCallbackMutation.mutateAsync({ code });
        setStatus('success');

        // Redirect to integrations page after 2 seconds
        setTimeout(() => {
          router.push('/settings/integrations');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to connect Gmail');
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Connecting Gmail...</h2>
            <p className="text-gray-600">Please wait while we set up your Gmail integration.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-2">Gmail Connected!</h2>
            <p className="text-gray-600">Redirecting you back to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/settings/integrations')}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

#### 5.3 components/clients/EmailHistory.tsx - Display Client Emails

```typescript
import { useState } from 'react';
import { trpc } from '../../utils/trpc';

interface EmailHistoryProps {
  clientId: string;
}

export default function EmailHistory({ clientId }: EmailHistoryProps) {
  const [maxResults, setMaxResults] = useState(20);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = trpc.gmail.listClientEmails.useQuery({
    clientId,
    maxResults,
  });

  const toggleEmailExpanded = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Email History</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Email History</h3>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error.message === 'Gmail not connected' ? (
            <>
              Gmail is not connected.
              <a href="/settings/integrations" className="underline ml-1">
                Connect Gmail
              </a>
            </>
          ) : (
            `Error loading emails: ${error.message}`
          )}
        </div>
      </div>
    );
  }

  if (!data || data.emails.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Email History</h3>
        <p className="text-gray-500">No emails found with {data?.clientEmail || 'this client'}.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Email History ({data.totalCount})
        </h3>
        <span className="text-sm text-gray-500">{data.clientEmail}</span>
      </div>

      <div className="space-y-3">
        {data.emails.map((email) => (
          <div
            key={email.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleEmailExpanded(email.id)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{email.subject}</h4>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {new Date(email.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>From: {email.from}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                {email.snippet}
              </p>
            </button>

            {expandedEmails.has(email.id) && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: email.body }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.emails.length >= maxResults && (
        <button
          onClick={() => setMaxResults(maxResults + 20)}
          className="mt-4 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
        >
          Load More
        </button>
      )}
    </div>
  );
}
```

#### 5.4 Enhanced components/workflow/ResponseDisplay.tsx

Add Gmail send functionality to existing ResponseDisplay component:

```typescript
// Add to existing ResponseDisplay.tsx

import { useState } from 'react';
import { trpc } from '../../utils/trpc';

// Inside component:
const [showSendModal, setShowSendModal] = useState(false);
const [sendTo, setSendTo] = useState('');
const [sendSubject, setSendSubject] = useState('');

const gmailStatus = trpc.gmail.getConnectionStatus.useQuery();
const sendEmailMutation = trpc.gmail.sendEmail.useMutation();
const createDraftMutation = trpc.gmail.createDraft.useMutation();

const handleSendViaGmail = async () => {
  try {
    await sendEmailMutation.mutateAsync({
      to: sendTo,
      subject: sendSubject,
      body: responseContent, // The AI-generated response
    });
    alert('Email sent successfully!');
    setShowSendModal(false);
  } catch (error: any) {
    alert(`Failed to send email: ${error.message}`);
  }
};

const handleCreateDraft = async () => {
  try {
    await createDraftMutation.mutateAsync({
      to: sendTo,
      subject: sendSubject,
      body: responseContent,
    });
    alert('Draft created in Gmail!');
    setShowSendModal(false);
  } catch (error: any) {
    alert(`Failed to create draft: ${error.message}`);
  }
};

// Add button to UI:
{gmailStatus.data?.isConnected && (
  <button
    onClick={() => setShowSendModal(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Send via Gmail
  </button>
)}

// Add modal for sending:
{showSendModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-4">Send via Gmail</h3>

      <input
        type="email"
        placeholder="To"
        value={sendTo}
        onChange={(e) => setSendTo(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3"
      />

      <input
        type="text"
        placeholder="Subject"
        value={sendSubject}
        onChange={(e) => setSendSubject(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      />

      <div className="flex space-x-3">
        <button
          onClick={handleSendViaGmail}
          disabled={!sendTo || !sendSubject || sendEmailMutation.isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sendEmailMutation.isLoading ? 'Sending...' : 'Send'}
        </button>

        <button
          onClick={handleCreateDraft}
          disabled={!sendTo || !sendSubject || createDraftMutation.isLoading}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {createDraftMutation.isLoading ? 'Creating...' : 'Save as Draft'}
        </button>

        <button
          onClick={() => setShowSendModal(false)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

#### 5.5 Enhanced pages/dashboard/clients/[id].tsx

Add EmailHistory component to client detail page:

```typescript
// Add to existing client detail page

import EmailHistory from '../../../components/clients/EmailHistory';

// In the render:
<div className="space-y-6">
  {/* Existing client details */}

  {/* Add Email History section */}
  <EmailHistory clientId={clientId} />
</div>
```

### 6. Type Definitions

#### 6.1 packages/shared/src/types/gmail.ts

```typescript
export interface GmailConnection {
  isConnected: boolean;
  email: string | null;
  connectedAt: string | null;
  syncEnabled: boolean;
}

export interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
}

export interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId?: string;
  };
}

export interface GmailSendResult {
  success: boolean;
  messageId: string;
  threadId?: string;
}
```

#### 6.2 packages/shared/src/schemas/gmailSchemas.ts

```typescript
import { z } from 'zod';

export const gmailConnectionSchema = z.object({
  isConnected: z.boolean(),
  email: z.string().email().nullable(),
  connectedAt: z.string().nullable(),
  syncEnabled: z.boolean(),
});

export const gmailEmailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
  snippet: z.string(),
  body: z.string(),
});

export const gmailSendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  clientId: z.string().uuid().optional(),
});

export const gmailCallbackInputSchema = z.object({
  code: z.string(),
});
```

### 7. Integration into Existing App

#### 7.1 Update server/routers/_app.ts

```typescript
import { gmailRouter } from './gmail';

export const appRouter = router({
  auth: authRouter,
  responses: responsesRouter,
  stripe: stripeRouter,
  clients: clientsRouter,
  projects: projectsRouter,
  history: historyRouter,
  gmail: gmailRouter, // Add this line
});
```

#### 7.2 Update .env.example

```env
# Existing env vars...

# Google OAuth (Gmail Integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/gmail-callback

# Encryption key for storing sensitive tokens (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_64_character_hex_key
```

### 8. Custom Hooks (Optional but Recommended)

#### 8.1 hooks/useGmailConnection.ts

```typescript
import { trpc } from '../utils/trpc';

export function useGmailConnection() {
  const { data: status, refetch } = trpc.gmail.getConnectionStatus.useQuery();
  const disconnectMutation = trpc.gmail.disconnectGmail.useMutation({
    onSuccess: () => refetch(),
  });
  const toggleSyncMutation = trpc.gmail.toggleSync.useMutation({
    onSuccess: () => refetch(),
  });

  return {
    isConnected: status?.isConnected ?? false,
    email: status?.email,
    syncEnabled: status?.syncEnabled ?? false,
    disconnect: disconnectMutation.mutateAsync,
    toggleSync: (enabled: boolean) => toggleSyncMutation.mutateAsync({ enabled }),
    isLoading: disconnectMutation.isLoading || toggleSyncMutation.isLoading,
  };
}
```

#### 8.2 hooks/useClientEmails.ts

```typescript
import { trpc } from '../utils/trpc';

export function useClientEmails(clientId: string, maxResults: number = 20) {
  const { data, isLoading, error, refetch } = trpc.gmail.listClientEmails.useQuery({
    clientId,
    maxResults,
  });

  return {
    emails: data?.emails ?? [],
    clientEmail: data?.clientEmail,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    refetch,
  };
}
```

### 9. Security Considerations

1. **Token Encryption**:
   - Refresh tokens are encrypted using AES-256-CBC
   - Encryption key stored in environment variables
   - Never expose tokens in API responses or logs

2. **OAuth Scopes**:
   - Request only necessary scopes
   - Clearly communicate permissions to users
   - Follow Google's OAuth best practices

3. **Rate Limiting**:
   - Apply existing rate limiting middleware to Gmail endpoints
   - Respect Gmail API quotas (daily limit: 1 billion quota units)
   - Implement exponential backoff for failed requests

4. **Error Handling**:
   - Never expose internal errors to client
   - Log detailed errors server-side for debugging
   - Provide user-friendly error messages

5. **Data Privacy**:
   - No email content stored locally (real-time API calls only)
   - RLS ensures users only access their own Gmail credentials
   - GDPR compliance: users can disconnect anytime

6. **Token Refresh**:
   - Automatically refresh access tokens when expired
   - Handle refresh token invalidation gracefully
   - Prompt user to reconnect if refresh fails

### 10. Testing Strategy

#### Manual Testing Checklist:

1. **OAuth Flow**:
   - [ ] Click "Connect Gmail" redirects to Google
   - [ ] User can grant permissions
   - [ ] Callback stores tokens correctly
   - [ ] User is redirected back to settings
   - [ ] Connection status shows correctly

2. **Email Fetching**:
   - [ ] Client emails load correctly
   - [ ] Email content displays properly
   - [ ] Pagination works (load more)
   - [ ] Error handling for missing client email

3. **Sending Emails**:
   - [ ] "Send via Gmail" button appears when connected
   - [ ] Modal pre-fills client email
   - [ ] Email sends successfully
   - [ ] Draft creation works
   - [ ] Error handling for failed sends

4. **Disconnection**:
   - [ ] Disconnect removes all credentials
   - [ ] Gmail features disabled after disconnect
   - [ ] Can reconnect successfully

5. **Edge Cases**:
   - [ ] Token expiration and refresh
   - [ ] Gmail API errors handled gracefully
   - [ ] No client email address set
   - [ ] Gmail not connected warnings

#### Automated Testing (Future):
- Unit tests for GmailService methods
- Integration tests for tRPC router
- E2E tests for OAuth flow

### 11. Deployment Considerations

1. **Google Cloud Console Setup**:
   - Create production OAuth credentials
   - Update authorized redirect URIs for production domain
   - Submit app for OAuth verification if needed (for >100 users)

2. **Environment Variables**:
   - Set all Google OAuth credentials in production
   - Generate strong encryption key (64 hex characters)
   - Update redirect URI for production domain

3. **Database Migration**:
   - Run migration 008 on production database
   - Verify RLS policies are in place
   - Test with production Supabase project

4. **Monitoring**:
   - Monitor Gmail API quota usage
   - Track OAuth flow success/failure rates
   - Alert on high error rates

### 12. Future Enhancements (Optional)

1. **Advanced Features**:
   - Email threading/conversation view
   - Smart email categorization
   - Email templates
   - Scheduled sends
   - Auto-reply functionality

2. **Performance Optimizations**:
   - Cache frequently accessed emails (if requirements change)
   - Batch email fetching
   - Background sync jobs

3. **Analytics**:
   - Track email open rates (using Gmail API)
   - Response time analytics
   - Client engagement metrics

4. **Multi-Account Support**:
   - Support multiple Gmail accounts per user
   - Account switching UI

### 13. Documentation

Create user-facing documentation:
- How to connect Gmail
- Privacy policy for Gmail data
- Troubleshooting guide
- FAQ (permissions, data usage, disconnection)

---

## Summary

This implementation plan provides a complete Gmail integration following your existing architecture patterns (Stripe integration, tRPC, Supabase). The solution:

✅ **Meets all requirements**: Read emails, send emails, auto-link to clients, communication history
✅ **Real-time API calls**: No local storage/caching
✅ **Secure**: OAuth 2.0, encrypted tokens, RLS
✅ **Follows existing patterns**: tRPC routers, protected procedures, error handling
✅ **Type-safe**: End-to-end TypeScript with Zod validation
✅ **User-friendly**: Clean UI, clear error messages, easy disconnect

**Estimated Development Time**: 2-3 days (experienced developer)

**Files to create**: 11 new files
**Files to modify**: 4 existing files

Let me know if you'd like me to proceed with implementation or if you have any questions about the plan!
