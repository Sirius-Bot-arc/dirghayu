
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type SummaryData = {
  elderName?: string;
  generatedAt?: string;
  period?: { start?: string; end?: string };
  adherence?: unknown;
  missedDoses?: Array<{
    medicationName?: string;
    scheduledAt?: string;
    reason?: string | null;
  }>;
  elderNotes?: string | null;
  medications?: Array<{
    id: string;
    name: string;
    genericName?: string | null;
    dosage?: string;
    unit?: string;
    frequency?: string;
    instructions?: string | null;
    times?: string[];
    startDate?: string;
    endDate?: string | null;
  }>;
  appointments?: Array<{
    id: string;
    title: string;
    provider?: string | null;
    location?: string | null;
    scheduledAt: string;
    status?: string;
    description?: string | null;
  }>;
  pendingChanges?: Array<{
    id: string;
    type?: string;
    status?: string;
    requestedBy?: string;
  }>;
};

function formatDate(value?: string) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value?: string) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function DetailValue({ value }: { value: unknown }): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-500">Not recorded</span>;
  }

  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>None recorded</span>;

    return (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((item, index) => (
          <li key={index}>
            <DetailValue value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    const hiddenKeys = [
      'id',
      'householdId',
      'memberId',
      'medicationId',
      'createdBy',
      'updatedAt',
      'deletedAt',
    ];

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !hiddenKeys.includes(key));

    if (entries.length === 0) return <span>Details unavailable</span>;

    return (
      <div className="space-y-2">
        {entries.map(([key, item]) => (
          <div key={key}>
            <span className="font-semibold">{formatLabel(key)}: </span>
            <DetailValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  return <span>Not available</span>;
}

export default function SummaryPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [days, setDays] = useState('90');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/summary?days=${days}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Could not generate your summary.'
        );
      }

      setSummary(result.data);
    } catch (error) {
      setSummary(null);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-5 py-8 text-[#26352D]">
      <div className="mx-auto max-w-5xl">
        <div className="print:hidden">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-lg font-semibold text-[#285943] underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <header className="mt-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg text-gray-600">
              Your health information, organised.
            </p>

            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              Doctor Visit Summary
            </h1>

            <p className="mt-2 text-lg text-gray-600">
              A summary to help you prepare for your next appointment.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!summary || loading}
            className="min-h-12 rounded-xl bg-[#285943] px-6 py-3 text-lg font-semibold text-white disabled:opacity-50 print:hidden"
          >
            Print / Save as PDF
          </button>
        </header>

        <div className="mt-7 flex flex-wrap items-center gap-3 print:hidden">
          <label htmlFor="summary-period" className="text-lg font-semibold">
            Summary period
          </label>

          <select
            id="summary-period"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="min-h-12 rounded-lg border border-gray-300 bg-white px-4 py-2 text-lg"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
          </select>

          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="min-h-12 rounded-lg border border-[#285943] px-5 py-2 font-semibold text-[#285943] disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {message && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-[#D8C9AE] bg-white p-5 text-lg"
          >
            <p className="font-semibold">Summary unavailable</p>
            <p className="mt-1">{message}</p>
          </div>
        )}

        {loading && (
          <p className="mt-8 text-lg">Generating your health summary...</p>
        )}

        {!loading && summary && (
          <div className="mt-8 space-y-6" id="doctor-summary">
            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Patient summary
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {summary.elderName || 'Patient'}
              </h2>

              <p className="mt-2 text-gray-600">
                Reporting period: {formatDate(summary.period?.start)} – {formatDate(summary.period?.end)}
              </p>

              <p className="mt-1 text-gray-600">
                Generated: {formatDateTime(summary.generatedAt)}
              </p>
            </section>

            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <h2 className="text-2xl font-bold">Medication overview</h2>

              {!summary.medications?.length ? (
                <p className="mt-3 text-gray-600">No active medicines recorded.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {summary.medications.map((med) => (
                    <article
                      key={med.id}
                      className="border-b border-[#E9DFCF] pb-4 last:border-0"
                    >
                      <h3 className="text-lg font-bold">{med.name}</h3>

                      {med.genericName && (
                        <p className="mt-1 text-gray-600">
                          Generic name: {med.genericName}
                        </p>
                      )}

                      <p className="mt-1">
                        <strong>Dosage:</strong> {med.dosage} {med.unit}
                      </p>

                      {med.frequency && (
                        <p className="mt-1">
                          <strong>Frequency:</strong> {formatLabel(med.frequency)}
                        </p>
                      )}

                      {med.times?.length ? (
                        <p className="mt-1">
                          <strong>Scheduled times:</strong> {med.times.join(', ')}
                        </p>
                      ) : null}

                      {med.instructions && (
                        <p className="mt-2 text-gray-600">{med.instructions}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <h2 className="text-2xl font-bold">Medication adherence</h2>

              <div className="mt-4 text-lg leading-relaxed">
                <DetailValue value={summary.adherence} />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <h2 className="text-2xl font-bold">Missed doses</h2>

              {!summary.missedDoses?.length ? (
                <p className="mt-3 text-gray-600">
                  No missed doses recorded in this reporting period.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {summary.missedDoses.map((dose, index) => (
                    <li
                      key={`${dose.medicationName}-${dose.scheduledAt}-${index}`}
                      className="border-b border-[#E9DFCF] pb-3 last:border-0"
                    >
                      <p className="font-semibold">{dose.medicationName}</p>
                      <p className="mt-1 text-gray-600">
                        {formatDateTime(dose.scheduledAt)}
                      </p>
                      {dose.reason && (
                        <p className="mt-1">Note: {dose.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <h2 className="text-2xl font-bold">Appointments</h2>

              {!summary.appointments?.length ? (
                <p className="mt-3 text-gray-600">
                  No appointments recorded for this period.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {summary.appointments.map((appointment) => (
                    <article
                      key={appointment.id}
                      className="border-b border-[#E9DFCF] pb-4 last:border-0"
                    >
                      <h3 className="text-lg font-bold">{appointment.title}</h3>
                      <p className="mt-1">
                        {formatDateTime(appointment.scheduledAt)}
                      </p>

                      {appointment.provider && (
                        <p className="mt-1">Doctor: {appointment.provider}</p>
                      )}

                      {appointment.location && (
                        <p className="mt-1">Location: {appointment.location}</p>
                      )}

                      {appointment.status && (
                        <p className="mt-1">Status: {formatLabel(appointment.status)}</p>
                      )}

                      {appointment.description && (
                        <p className="mt-2 text-gray-600">{appointment.description}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <h2 className="text-2xl font-bold">Pending requests</h2>

              {!summary.pendingChanges?.length ? (
                <p className="mt-3 text-gray-600">No pending requests.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {summary.pendingChanges.map((change) => (
                    <article key={change.id}>
                      <p className="font-semibold">
                        {formatLabel(change.type || 'Household request')}
                      </p>
                      <p className="text-gray-600">
                        Status: {formatLabel(change.status || 'pending')}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#E9DFCF] bg-white p-6">
              <h2 className="text-2xl font-bold">Additional notes</h2>
              <p className="mt-3 whitespace-pre-wrap text-gray-700">
                {summary.elderNotes || 'No additional notes have been recorded.'}
              </p>
            </section>

            <p className="pb-6 text-sm leading-relaxed text-gray-600">
              This summary is generated from information recorded in Dirghayu.
              Please review it for accuracy with your healthcare professional.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }

          #doctor-summary {
            margin-top: 0;
          }

          #doctor-summary section {
            break-inside: avoid;
            box-shadow: none !important;
          }

          @page {
            margin: 15mm;
          }
        }
      `}</style>
    </main>
  );
}

