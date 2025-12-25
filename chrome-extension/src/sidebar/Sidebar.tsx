import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MESSAGE_TYPES } from '../shared/constants';
import { ClientContext } from './components/ClientContext';
import { ScopeDetection } from './components/ScopeDetection';
import { ResponseGenerator } from './components/ResponseGenerator';
import type { AuthState, EmailData, ExtensionMessage, Client } from '../shared/types';
import './sidebar.css';

type Tab = 'client' | 'scope' | 'response';

function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('client');
  const [currentEmail, setCurrentEmail] = useState<EmailData | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    loading: true,
  });

  // Check auth state on mount
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.GET_AUTH_STATE },
      (response: AuthState) => {
        if (response) {
          setAuthState({ ...response, loading: false });
        } else {
          setAuthState((prev) => ({ ...prev, loading: false }));
        }
      }
    );

    // Listen for auth state changes
    const listener = (message: ExtensionMessage<AuthState>) => {
      if (message.type === MESSAGE_TYPES.AUTH_STATE_CHANGED && message.payload) {
        setAuthState({ ...message.payload, loading: false });
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    // Listen for email data from content script
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage<EmailData>;

      if (message.type === MESSAGE_TYPES.EMAIL_OPENED && message.payload) {
        setCurrentEmail(message.payload);
        setIsLoading(false);
      } else if (message.type === MESSAGE_TYPES.EMAIL_CLOSED) {
        setCurrentEmail(null);
        setClient(null);
      }
    };

    window.addEventListener('message', handleMessage);

    // Initial loading state timeout
    const timeout = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  const tabs = [
    { id: 'client' as Tab, label: 'Client', icon: '👤' },
    { id: 'scope' as Tab, label: 'Scope', icon: '🛡️' },
    { id: 'response' as Tab, label: 'Response', icon: '✍️' },
  ];

  if (isLoading || authState.loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <p className="text-gray-900 font-medium mb-2">
            <span className="text-emerald-600">Freelance</span>
            <span className="text-gray-600">Flow</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Click the extension icon to sign in and start using FreelanceFlow.
          </p>
          <button
            onClick={() => {
              // Open the extension popup
              chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
            }}
            className="btn-primary text-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!currentEmail) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">📧</div>
          <p className="text-gray-600 font-medium">No email selected</p>
          <p className="text-sm text-gray-500 mt-1">
            Open an email to see client context and generate responses
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Email context header */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="text-sm">
          <p className="font-medium text-gray-900 truncate">{currentEmail.senderName || currentEmail.senderEmail}</p>
          {currentEmail.senderName && (
            <p className="text-gray-500 text-xs truncate">{currentEmail.senderEmail}</p>
          )}
        </div>
        {currentEmail.subject && (
          <p className="text-xs text-gray-500 mt-1 truncate">Re: {currentEmail.subject}</p>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'client' && (
          <ClientContext email={currentEmail} client={client} setClient={setClient} />
        )}
        {activeTab === 'scope' && (
          <ScopeDetection email={currentEmail} />
        )}
        {activeTab === 'response' && (
          <ResponseGenerator email={currentEmail} client={client} />
        )}
      </div>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Sidebar />);
}
