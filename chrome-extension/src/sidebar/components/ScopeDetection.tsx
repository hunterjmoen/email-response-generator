import React, { useState, useEffect } from 'react';
import { checkScopeCreep } from '../../shared/api-client';
import type { EmailData, ScopeCreepResult } from '../../shared/types';

interface ScopeDetectionProps {
  email: EmailData;
}

export function ScopeDetection({ email }: ScopeDetectionProps) {
  const [result, setResult] = useState<ScopeCreepResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeEmail();
  }, [email.body]);

  const analyzeEmail = async () => {
    if (!email.body) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scopeResult = await checkScopeCreep(email.body);
      setResult(scopeResult);
    } catch (err) {
      setError('Failed to analyze email');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          Analyzing email for scope creep...
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
            onClick={analyzeEmail}
            className="block mt-2 text-red-600 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!email.body) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500 text-sm">
          No email content to analyze
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500 text-sm">
          Unable to analyze email
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {result.detected ? (
        <div className="space-y-4">
          {/* Alert banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h3 className="font-semibold text-red-800">Scope Creep Detected</h3>
                <p className="text-sm text-red-700 mt-1">
                  This email may contain requests outside the original project scope.
                </p>
              </div>
            </div>
          </div>

          {/* Confidence meter */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Confidence</span>
              <span className="font-medium text-red-600">{Math.round(result.confidence * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${result.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Detected phrases */}
          {result.phrases.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Flagged phrases:</h4>
              <ul className="space-y-2">
                {result.phrases.map((phrase, index) => (
                  <li
                    key={index}
                    className="bg-red-50 text-red-800 px-3 py-2 rounded text-sm"
                  >
                    "{phrase}"
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                // TODO: Open change order builder
                alert('Change order builder coming soon!');
              }}
              className="btn-primary w-full text-sm"
            >
              Create Change Order
            </button>
            <button
              onClick={() => {
                // TODO: Generate boundary response
                alert('Boundary response generator coming soon!');
              }}
              className="btn-secondary w-full text-sm"
            >
              Generate Boundary Response
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h3 className="font-semibold text-green-800">No Scope Creep Detected</h3>
              <p className="text-sm text-green-700 mt-1">
                This email appears to be within the expected project scope.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
