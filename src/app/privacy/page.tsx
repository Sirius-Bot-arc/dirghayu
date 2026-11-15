
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type ConsentType =
  | 'data_processing'
  | 'ai_photo_processing'
  | 'email_reminders';

type ConsentStatus = {
  granted: boolean;
  version: number;
  grantedAt: string | null;
};

type ConsentSettings = Record<ConsentType, ConsentStatus>;

const CONSENT_OPTIONS: {
  type: ConsentType;
  title: string;
  description: string;
  detail: string;
}[] = [
  {
    type: 'data_processing',
    title: 'Health information processing',
    description:
      'Permission relating to the processing of your household health information in Dirghayu.',
    detail:
      'This setting records your choice about data processing. Review the privacy information before making your decision.',
  },
  {
    type: 'ai_photo_processing',
    title: 'AI-assisted features',
    description:
      'Allow AI-assisted medicine explanations, interaction checks and prescription scanning.',
    detail:
      'These features use AI to provide educational information. AI output is not medical advice. Always check with your doctor or pharmacist.',
  },
  {
    type: 'email_reminders',
    title: 'Email reminders',
    description:
      'Allow Dirghayu to send you email reminders where that feature is available.',
    detail:
      'You can change this choice later from this page.',
  },
];

const DEFAULT_SETTINGS: ConsentSettings = {
  data_processing: { granted: false, version: 1, grantedAt: null },
  ai_photo_processing: { granted: false, version: 1, grantedAt: null },
  email_reminders: { granted: false, version: 1, grantedAt: null },
};

function formatDate(value: string | null) {
  if (!value) return 'Not granted';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function PrivacyPage() {
  const [settings, setSettings] =
    useState<ConsentSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<ConsentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/consent');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Could not load your consent settings.'
        );
      }

      const loaded = result.data.consents as ConsentSettings;
      setSettings(loaded);
      setSavedSettings(loaded);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function changeConsent(type: ConsentType, granted: boolean) {
    setSettings((current) => ({
      ...current,
      [type]: {
        ...current[type],
        granted,
      },
    }));
    setMessage('');
    setError('');
  }

  const hasChanges = CONSENT_OPTIONS.some(
    ({ type }) =>
      settings[type].granted !== savedSettings[type].granted
  );

  async function saveSettings() {
    const changes = CONSENT_OPTIONS
      .filter(
        ({ type }) =>
          settings[type].granted !== savedSettings[type].granted
      )
      .map(({ type }) => ({
        type,
        granted: settings[type].granted,
      }));

    if (changes.length === 0) {
      setMessage('There are no changes to save.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consents: changes }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Could not save your choices.'
        );
      }

      const updated = result.data.consents as ConsentSettings;
      setSettings(updated);
      setSavedSettings(updated);
      setMessage('Your consent choices have been saved.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-5 py-8 text-[#26352D]">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-lg font-semibold text-[#285943] underline"
        >
          ← Back to Dashboard
        </Link>

        <header className="mt-7">
          <p className="text-lg text-gray-600">
            Your information. Your choices.
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Privacy & Consent
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-700">
            Choose which optional features and permissions you want to allow.
            You can review and change your choices here.
          </p>
        </header>

        <section className="mt-7 rounded-2xl border border-[#E9DFCF] bg-white p-6">
          <h2 className="text-xl font-bold">Your consent choices</h2>
          <p className="mt-2 text-gray-600">
            These settings apply to the account you are currently signed in to.
            Each choice is separate. Nothing is switched on automatically here.
          </p>
        </section>

        {loading && (
          <p className="mt-6 text-lg" role="status">
            Loading your privacy settings...
          </p>
        )}

        {!loading && (
          <>
            <div className="mt-6 space-y-5">
              {CONSENT_OPTIONS.map((option) => {
                const status = settings[option.type];

                return (
                  <section
                    key={option.type}
                    className="rounded-2xl border border-[#E9DFCF] bg-white p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">
                          {option.title}
                        </h2>
                        <p className="mt-2 text-lg leading-relaxed text-gray-700">
                          {option.description}
                        </p>
                        <p className="mt-3 text-base leading-relaxed text-gray-600">
                          {option.detail}
                        </p>
                      </div>

                      <label className="flex min-h-12 shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-[#D8C9AE] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={status.granted}
                          onChange={(event) =>
                            changeConsent(
                              option.type,
                              event.target.checked
                            )
                          }
                          className="h-6 w-6 accent-[#285943]"
                        />
                        <span className="text-lg font-semibold">
                          {status.granted ? 'Allowed' : 'Not allowed'}
                        </span>
                      </label>
                    </div>

                    <p className="mt-4 border-t border-[#E9DFCF] pt-3 text-sm text-gray-500">
                      Last granted: {formatDate(status.grantedAt)}
                      {' · '}Consent version: {status.version}
                    </p>
                  </section>
                );
              })}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-300 bg-white p-4 text-red-800"
              >
                {error}
              </div>
            )}

            {message && (
              <p
                role="status"
                className="mt-6 rounded-xl border border-[#B8D6C4] bg-white p-4 text-lg text-[#285943]"
              >
                {message}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveSettings}
                disabled={!hasChanges || saving}
                className="min-h-12 rounded-xl bg-[#285943] px-6 py-3 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save my choices'}
              </button>

              <button
                type="button"
                onClick={loadSettings}
                disabled={saving}
                className="min-h-12 rounded-xl border border-[#285943] px-6 py-3 text-lg font-semibold text-[#285943] disabled:opacity-50"
              >
                Reload saved choices
              </button>
            </div>
          </>
        )}

        <section className="mt-8 rounded-2xl border border-[#E9DFCF] bg-[#FBF3E4] p-6">
          <h2 className="text-xl font-bold">A note about AI</h2>
          <p className="mt-2 leading-relaxed text-gray-700">
            AI-generated information can be incomplete or incorrect. Do not
            start, stop or change medication based only on an AI response.
            Please consult a qualified healthcare professional.
          </p>
        </section>

        <p className="mt-6 text-sm leading-relaxed text-gray-500">
          Your choices are recorded with timestamps and consent versions.
          If you have questions about how your information is handled, contact
          the person responsible for managing your Dirghayu service.
        </p>
      </div>
    </main>
  );
}

