
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Appointment = {
  id: string;
  title: string;
  description: string | null;
  provider: string | null;
  location: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  status: string;
};

function getLocalDateTime() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    title: '',
    provider: '',
    location: '',
    scheduledAt: getLocalDateTime(),
    durationMinutes: '30',
    description: '',
  });

  const loadAppointments = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/appointments');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Could not load appointments.'
        );
      }

      setAppointments(result.data?.items || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        title: form.title.trim(),
        provider: form.provider || null,
        location: form.location || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: form.durationMinutes
          ? Number(form.durationMinutes)
          : null,
        description: form.description || null,
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Could not save appointment.'
        );
      }

      const isPending = result.data?.proposedData !== undefined;

      setMessage(
        isPending
          ? 'Your appointment request has been sent for elder approval.'
          : 'Appointment added successfully!'
      );

      setShowForm(false);

      setForm({
        title: '',
        provider: '',
        location: '',
        scheduledAt: getLocalDateTime(),
        durationMinutes: '30',
        description: '',
      });

      await loadAppointments();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-5 py-8 text-[#26352D]">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-lg font-semibold text-[#285943] underline"
        >
          ← Back to Dashboard
        </Link>

        <header className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg text-gray-600">
              Your health, your choice.
            </p>

            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              Appointments
            </h1>

            <p className="mt-2 text-lg text-gray-600">
              Keep your doctor visits organised.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="min-h-12 rounded-xl bg-[#285943] px-6 py-3 text-lg font-semibold text-white"
          >
            {showForm ? 'Close form' : '+ Add appointment'}
          </button>
        </header>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-[#D8C9AE] bg-white p-4 text-lg"
          >
            {message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-2xl border border-[#E9DFCF] bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-bold">
              Add an appointment
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-lg font-semibold sm:col-span-2">
                Appointment title *
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. General health check-up"
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Doctor or provider
                <input
                  maxLength={200}
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                  placeholder="Doctor's name"
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Location
                <input
                  maxLength={200}
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="Clinic or hospital"
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Date and time *
                <input
                  required
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm({ ...form, scheduledAt: e.target.value })
                  }
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: e.target.value,
                    })
                  }
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>
            </div>

            <label className="block text-lg font-semibold">
              Reason or notes
              <textarea
                maxLength={1000}
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Anything you'd like to remember about this visit?"
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 font-normal"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-[#285943] px-7 py-3 text-lg font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save appointment'}
            </button>
          </form>
        )}

        <section className="mt-9">
          <h2 className="text-2xl font-bold">
            Your appointments
          </h2>

          {loading ? (
            <p className="mt-5 text-lg">
              Loading your appointments...
            </p>
          ) : appointments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#E9DFCF] bg-white p-7">
              <p className="text-xl font-semibold">
                No appointments added yet.
              </p>
              <p className="mt-2 text-lg text-gray-600">
                Add an appointment to keep your doctor visits organised.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-2xl border border-[#E9DFCF] bg-white p-6 shadow-sm"
                >
                  <h3 className="text-xl font-bold">
                    {appointment.title}
                  </h3>

                  <p className="mt-3 text-lg">
                    <strong>Date:</strong>{' '}
                    {formatDate(appointment.scheduledAt)}
                  </p>

                  {appointment.provider && (
                    <p className="mt-2 text-lg">
                      <strong>Doctor:</strong> {appointment.provider}
                    </p>
                  )}

                  {appointment.location && (
                    <p className="mt-2 text-lg">
                      <strong>Location:</strong> {appointment.location}
                    </p>
                  )}

                  {appointment.durationMinutes && (
                    <p className="mt-2 text-lg">
                      <strong>Duration:</strong>{' '}
                      {appointment.durationMinutes} minutes
                    </p>
                  )}

                  {appointment.description && (
                    <p className="mt-3 text-gray-600">
                      {appointment.description}
                    </p>
                  )}

                  <p className="mt-4 inline-block rounded-full bg-[#E8F1E9] px-4 py-2 text-sm font-semibold capitalize text-[#285943]">
                    {appointment.status}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
