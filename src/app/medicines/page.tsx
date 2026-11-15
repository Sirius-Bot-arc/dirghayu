
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Medication = {
  id: string;
  name: string;
  genericName: string | null;
  dosage: string;
  unit: string;
  instructions: string | null;
  frequency: string;
  startDate: string;
  endDate: string | null;
  times: string[];
  stockRemaining: number | null;
  notes: string | null;
};

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    genericName: '',
    dosage: '',
    unit: 'mg',
    instructions: '',
    frequency: 'daily',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    time: '09:00',
    stockRemaining: '',
    notes: '',
  });

  const loadMedicines = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/medications');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Could not load medicines.');
      }

      setMedicines(result.data?.items || []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        name: form.name,
        genericName: form.genericName || null,
        dosage: form.dosage,
        unit: form.unit,
        instructions: form.instructions || null,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate || null,
        times: [form.time],
        stockRemaining:
          form.stockRemaining === '' ? null : Number(form.stockRemaining),
        refillThresholdDays: 7,
        notes: form.notes || null,
      };

      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Could not save medicine.');
      }

      if (result.data?.proposedData) {
        setMessage('Your medicine request has been sent for elder approval.');
      } else {
        setMessage('Medicine added successfully!');
      }

      setForm({
        name: '',
        genericName: '',
        dosage: '',
        unit: 'mg',
        instructions: '',
        frequency: 'daily',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        time: '09:00',
        stockRemaining: '',
        notes: '',
      });

      setShowForm(false);
      await loadMedicines();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Something went wrong.'
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
            <p className="text-lg text-gray-600">Your health, your choice.</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
              My Medicines
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Keep your medicine schedule organised.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="min-h-12 rounded-xl bg-[#285943] px-6 py-3 text-lg font-semibold text-white"
          >
            {showForm ? 'Close form' : '+ Add medicine'}
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
            <h2 className="text-2xl font-bold">Add a medicine</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-lg font-semibold">
                Medicine name *
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Generic name
                <input
                  value={form.genericName}
                  onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Dosage *
                <input
                  required
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  placeholder="e.g. 1"
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Unit *
                <input
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="e.g. tablet, mg"
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Frequency *
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 bg-white p-3 font-normal"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="as_needed">As needed</option>
                </select>
              </label>

              <label className="block text-lg font-semibold">
                Reminder time *
                <input
                  required
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Start date *
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                End date (optional)
                <input
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>

              <label className="block text-lg font-semibold">
                Remaining stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockRemaining}
                  onChange={(e) => setForm({ ...form, stockRemaining: e.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                />
              </label>
            </div>

            <label className="block text-lg font-semibold">
              Instructions
              <textarea
                maxLength={500}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 font-normal"
                rows={2}
              />
            </label>

            <label className="block text-lg font-semibold">
              Notes
              <textarea
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 font-normal"
                rows={2}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-[#285943] px-7 py-3 text-lg font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save medicine'}
            </button>
          </form>
        )}

        <section className="mt-9">
          <h2 className="text-2xl font-bold">Your medicine list</h2>

          {loading ? (
            <p className="mt-5 text-lg">Loading your medicines...</p>
          ) : medicines.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#E9DFCF] bg-white p-7">
              <p className="text-xl font-semibold">No medicines added yet.</p>
              <p className="mt-2 text-lg text-gray-600">
                Add a medicine to start organising your schedule.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {medicines.map((medicine) => (
                <article
                  key={medicine.id}
                  className="rounded-2xl border border-[#E9DFCF] bg-white p-6 shadow-sm"
                >
                  <h3 className="text-xl font-bold">{medicine.name}</h3>

                  {medicine.genericName && (
                    <p className="mt-1 text-gray-600">{medicine.genericName}</p>
                  )}

                  <p className="mt-3 text-lg">
                    <strong>Dosage:</strong> {medicine.dosage} {medicine.unit}
                  </p>

                  <p className="mt-1 text-lg">
                    <strong>Frequency:</strong>{' '}
                    {medicine.frequency.replace('_', ' ')}
                  </p>

                  <p className="mt-1 text-lg">
                    <strong>Times:</strong> {medicine.times?.join(', ')}
                  </p>

                  {medicine.instructions && (
                    <p className="mt-3 text-gray-600">
                      {medicine.instructions}
                    </p>
                  )}

                  {medicine.stockRemaining !== null && (
                    <p className="mt-2 text-gray-600">
                      Remaining stock: {medicine.stockRemaining}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
