
'use client';

import Link from 'next/link';
import { useState } from 'react';

type MedicineInput = {
  name: string;
  genericName: string;
  dosage: string;
};

type AIResult = {
  [key: string]: unknown;
  disclaimer?: string;
};

export default function MedicineHelpPage() {
  const [activeTab, setActiveTab] = useState<'explain' | 'interactions'>('explain');

  const [medicine, setMedicine] = useState<MedicineInput>({
    name: '',
    genericName: '',
    dosage: '',
  });

  const [medications, setMedications] = useState<MedicineInput[]>([
    { name: '', genericName: '', dosage: '' },
    { name: '', genericName: '', dosage: '' },
  ]);

  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submitExplanation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: medicine.name,
          genericName: medicine.genericName || null,
          dosage: medicine.dosage || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Could not explain this medicine.');
      }

      setResult(data.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function submitInteractions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (medications.length < 2) {
      setMessage('Please enter at least two medicines.');
      return;
    }

    setLoading(true);
    setMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/ai/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: medications.map((item) => ({
            name: item.name,
            genericName: item.genericName || null,
            dosage: item.dosage || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Could not check interactions.');
      }

      setResult(data.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function updateMedication(index: number, field: keyof MedicineInput, value: string) {
    setMedications((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addMedication() {
    if (medications.length >= 20) return;

    setMedications((current) => [
      ...current,
      { name: '', genericName: '', dosage: '' },
    ]);
  }

  function removeMedication(index: number) {
    if (medications.length <= 2) return;

    setMedications((current) => current.filter((_, i) => i !== index));
  }

  function renderValue(value: unknown): React.ReactNode {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string' || typeof value === 'number') {
      return <p className="mt-1 whitespace-pre-wrap break-words">{String(value)}</p>;
    }

    if (typeof value === 'boolean') {
      return <p className="mt-1">{value ? 'Yes' : 'No'}</p>;
    }

    if (Array.isArray(value)) {
      return (
        <ul className="mt-2 list-disc space-y-2 pl-6">
          {value.map((item, index) => (
            <li key={index}>{renderValue(item)}</li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="mt-2 space-y-3">
          {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
            <div key={key}>
              <p className="font-semibold capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
              </p>
              {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }

    return null;
  }

  const visibleResult = result
    ? Object.entries(result).filter(([key]) => key !== 'disclaimer')
    : [];

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
          <p className="text-lg text-gray-600">Understand your medicines.</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Medicine Help
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Get simple explanations and screen for possible medicine interactions.
          </p>
        </header>

        <div className="mt-7 rounded-2xl border border-[#E9DFCF] bg-white p-5">
          <p className="font-bold">Before you begin</p>
          <p className="mt-2 leading-relaxed text-gray-700">
            These tools use AI to provide educational information. Your household
            must have granted AI-processing consent before you can use them.
            Information from AI is not a diagnosis or a substitute for advice
            from your doctor or pharmacist.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('explain');
              setResult(null);
              setMessage('');
            }}
            className={`min-h-14 rounded-xl px-4 py-3 text-lg font-semibold ${
              activeTab === 'explain'
                ? 'bg-[#00606B] text-white'
                : 'border border-[#D8C9AE] bg-white text-[#26352D]'
            }`}
          >
            💊 Explain a medicine
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('interactions');
              setResult(null);
              setMessage('');
            }}
            className={`min-h-14 rounded-xl px-4 py-3 text-lg font-semibold ${
              activeTab === 'interactions'
                ? 'bg-[#00606B] text-white'
                : 'border border-[#D8C9AE] bg-white text-[#26352D]'
            }`}
          >
            🔎 Check interactions
          </button>
        </div>

        {activeTab === 'explain' ? (
          <form
            onSubmit={submitExplanation}
            className="mt-6 space-y-5 rounded-2xl border border-[#E9DFCF] bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-bold">Explain a medicine</h2>

            <label className="block text-lg font-semibold">
              Medicine name *
              <input
                required
                maxLength={100}
                value={medicine.name}
                onChange={(e) => setMedicine({ ...medicine, name: e.target.value })}
                placeholder="Enter medicine name"
                className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
              />
            </label>

            <label className="block text-lg font-semibold">
              Generic name (optional)
              <input
                maxLength={100}
                value={medicine.genericName}
                onChange={(e) => setMedicine({ ...medicine, genericName: e.target.value })}
                placeholder="If known"
                className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
              />
            </label>

            <label className="block text-lg font-semibold">
              Dosage (optional)
              <input
                maxLength={50}
                value={medicine.dosage}
                onChange={(e) => setMedicine({ ...medicine, dosage: e.target.value })}
                placeholder="As written on your prescription"
                className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-xl bg-[#285943] px-6 py-3 text-lg font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Getting explanation...' : 'Explain this medicine'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={submitInteractions}
            className="mt-6 space-y-5 rounded-2xl border border-[#E9DFCF] bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-bold">Check medicine interactions</h2>

            <p className="text-gray-600">
              Enter at least two medicines. You can add up to twenty.
            </p>

            {medications.map((item, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-[#E9DFCF] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">Medicine {index + 1}</h3>

                  {medications.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="min-h-10 px-3 font-semibold text-red-700 underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="block font-semibold">
                  Medicine name *
                  <input
                    required
                    maxLength={100}
                    value={item.name}
                    onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                  />
                </label>

                <label className="block font-semibold">
                  Generic name (optional)
                  <input
                    maxLength={100}
                    value={item.genericName}
                    onChange={(e) => updateMedication(index, 'genericName', e.target.value)}
                    className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                  />
                </label>

                <label className="block font-semibold">
                  Dosage (optional)
                  <input
                    maxLength={50}
                    value={item.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    className="mt-2 min-h-12 w-full rounded-lg border border-gray-300 p-3 font-normal"
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={addMedication}
              disabled={medications.length >= 20}
              className="min-h-11 rounded-lg border border-[#285943] px-5 py-2 font-semibold text-[#285943] disabled:opacity-50"
            >
              + Add another medicine
            </button>

            <button
              type="submit"
              disabled={loading || medications.some((item) => !item.name.trim())}
              className="min-h-12 w-full rounded-xl bg-[#285943] px-6 py-3 text-lg font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Checking interactions...' : 'Check interactions'}
            </button>
          </form>
        )}

        {message && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-[#D8C9AE] bg-white p-4 text-lg"
          >
            <p className="font-semibold">Unable to complete the request</p>
            <p className="mt-1">{message}</p>

            {message.toLowerCase().includes('consent') && (
              <p className="mt-3 text-base text-gray-600">
                Please review the household AI consent settings before trying again.
              </p>
            )}
          </div>
        )}

        {result && (
          <section className="mt-8 rounded-2xl border border-[#D8C9AE] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">AI information</h2>

            {visibleResult.length > 0 ? (
              <div className="mt-5 space-y-5">
                {visibleResult.map(([key, value]) => (
                  <div key={key} className="border-b border-[#E9DFCF] pb-4 last:border-0">
                    <h3 className="text-lg font-bold capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </h3>
                    <div className="text-base leading-relaxed">
                      {renderValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-gray-600">
                The AI returned no explanation details.
              </p>
            )}

            {result.disclaimer && (
              <div className="mt-6 rounded-xl bg-[#FFF3D9] p-4 text-base leading-relaxed">
                <strong>Important:</strong> {result.disclaimer}
              </div>
            )}
          </section>
        )}

        <div className="mt-7 rounded-2xl border border-[#E9DFCF] bg-[#FFF3D9] p-5">
          <h2 className="text-lg font-bold">Your safety matters</h2>
          <p className="mt-2 leading-relaxed">
            Never start, stop, or change a medicine based only on an AI response.
            For urgent symptoms or a suspected serious reaction, seek medical help.
            Confirm possible interactions with your doctor or pharmacist.
          </p>
        </div>
      </div>
    </main>
  );
}
