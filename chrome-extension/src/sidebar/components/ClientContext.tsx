import React, { useState, useEffect } from 'react';
import { getClientByEmail, createClient } from '../../shared/api-client';
import type { Client, EmailData, CreateClientPayload } from '../../shared/types';

interface ClientContextProps {
  email: EmailData;
  client: Client | null;
  setClient: (client: Client | null) => void;
}

export function ClientContext({ email, client, setClient }: ClientContextProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state for creating new client
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  useEffect(() => {
    lookupClient();
  }, [email.senderEmail]);

  const lookupClient = async () => {
    if (!email.senderEmail) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const foundClient = await getClientByEmail(email.senderEmail);
      setClient(foundClient);

      // Pre-fill name from email if no client found
      if (!foundClient && email.senderName) {
        setNewClientName(email.senderName);
      }
    } catch (err) {
      setError('Failed to look up client');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const payload: CreateClientPayload = {
        name: newClientName.trim(),
        email: email.senderEmail,
        company: newClientCompany.trim() || undefined,
        relationshipStage: 'new',
      };

      const newClient = await createClient(payload);
      setClient(newClient);
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
          <button
            onClick={lookupClient}
            className="block mt-2 text-red-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (client) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Client header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{client.name}</h3>
              {client.company && (
                <p className="text-sm text-gray-500">{client.company}</p>
              )}
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                (client.relationship_stage || client.relationshipStage) === 'long_term'
                  ? 'bg-green-100 text-green-700'
                  : (client.relationship_stage || client.relationshipStage) === 'established'
                  ? 'bg-blue-100 text-blue-700'
                  : (client.relationship_stage || client.relationshipStage) === 'difficult'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {(client.relationship_stage || client.relationshipStage || 'new').replace('_', ' ')}
            </span>
          </div>

          {/* Health score */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Health Score</span>
              <span className="font-medium">{client.health_score ?? client.healthScore ?? 50}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (client.health_score ?? client.healthScore ?? 50) >= 70
                    ? 'bg-green-500'
                    : (client.health_score ?? client.healthScore ?? 50) >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${client.health_score ?? client.healthScore ?? 50}%` }}
              />
            </div>
          </div>

          {/* Priority */}
          {(client.priority) && (
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-gray-600">Priority</span>
              <span
                className={`px-2 py-0.5 rounded ${
                  client.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : client.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {client.priority}
              </span>
            </div>
          )}

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {client.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Last contact */}
          {(client.last_contact_date || client.lastContactDate) && (
            <p className="text-xs text-gray-500 mt-3">
              Last contact: {new Date(client.last_contact_date || client.lastContactDate!).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // No client found - show create option
  return (
    <div className="p-4">
      {!showCreateForm ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-3">
            <strong>{email.senderEmail}</strong> is not in your client list.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary w-full text-sm !bg-yellow-600 hover:!bg-yellow-700"
          >
            Add as Client
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreateClient} className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Client</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email.senderEmail}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={newClientCompany}
                onChange={(e) => setNewClientCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Company name (optional)"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newClientName.trim()}
              className="btn-primary flex-1 text-sm disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
