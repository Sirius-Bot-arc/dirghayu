
'use client';

import Logo from '@/components/Logo';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function SetupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [elderDisplayName, setElderDisplayName] = useState('');
  const [elderEmail, setElderEmail] = useState('');
  const [elderPasscode, setElderPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [householdId, setHouseholdId] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!/^\d{6,20}$/.test(elderPasscode)) {
      setError('The elder passcode must contain 6–20 digits.');
      return;
    }

    if (elderPasscode !== confirmPasscode) {
      setError('The passcodes do not match.');
      return;
    }

    if (!ageConfirmed) {
      setError('Please confirm that you are 18 or older.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          timezone: 'Asia/Kolkata',
          elderDisplayName: elderDisplayName.trim(),
          elderPasscode,
          elderEmail: elderEmail.trim() || null,
          creatorAgeConfirmed: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.error?.message || 'Could not create your household. Please try again.'
        );
        return;
      }

      setHouseholdId(result.data.household.id);
    } catch {
      setError('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  if (householdId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-5 py-10 text-[#26352D]">
        <section className="w-full max-w-lg rounded-3xl border border-[#E9DFCF] bg-white p-8 text-center shadow-lg">
          <div className="mb-6 flex justify-center">
            <Logo variant="lockup" className="w-60 max-w-full" />
          </div>

          <div className="text-5xl" aria-hidden="true">🎉</div>
          <h1 className="mt-5 text-3xl font-bold">Your household is ready!</h1>
          <p className="mt-3 text-base text-gray-600">
            Save this Household ID. You will need it whenever you sign in again.
          </p>

          <div className="mt-6 rounded-2xl border border-[#D8CCBB] bg-[#FFFCF7] p-5">
            <p className="text-sm font-semibold text-gray-600">YOUR HOUSEHOLD ID</p>
            <p className="mt-2 break-all text-2xl font-bold tracking-wide text-[#00606B]">
              {householdId}
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(householdId)}
              className="mt-4 rounded-lg border border-[#00606B] px-4 py-2 font-semibold text-[#00606B] hover:bg-[#E8F1F1]"
            >
              Copy Household ID
            </button>
          </div>

          <p className="mt-5 text-sm text-gray-600">
            Your elder account has been created. You are now signed in.
          </p>

          <button
            type="button"
            onClick={() => router.replace('/')}
            className="mt-6 min-h-14 w-full rounded-xl bg-[#00606B] px-5 py-3 text-lg font-bold text-white hover:bg-[#004F58]"
          >
            Go to my dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF9F0] px-5 py-10 text-[#26352D]">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex justify-center">
          <Logo variant="lockup" className="w-64 max-w-full" />
        </div>

        <section className="rounded-3xl border border-[#E9DFCF] bg-white p-7 shadow-lg sm:p-9">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D81B60]">
              Let's get started
            </p>
            <h1 className="mt-3 text-3xl font-bold">Create your household</h1>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Set up your care space. You can add caretakers and family members later.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="householdName" className="mb-2 block font-semibold">
                Household name
              </label>
              <input
                id="householdName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma Family"
                maxLength={100}
                required
                className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 text-lg outline-none focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
              />
            </div>

            <div>
              <label htmlFor="elderName" className="mb-2 block font-semibold">
                Elder's name
              </label>
              <input
                id="elderName"
                value={elderDisplayName}
                onChange={(e) => setElderDisplayName(e.target.value)}
                placeholder="Enter the elder's name"
                maxLength={100}
                required
                className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 text-lg outline-none focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
              />
            </div>

            <div>
              <label htmlFor="elderEmail" className="mb-2 block font-semibold">
                Email address <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                id="elderEmail"
                type="email"
                value={elderEmail}
                onChange={(e) => setElderEmail(e.target.value)}
                placeholder="Enter an email address"
                maxLength={254}
                className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 text-lg outline-none focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
              />
            </div>

            <div>
              <label htmlFor="elderPasscode" className="mb-2 block font-semibold">
                Create elder passcode
              </label>
              <input
                id="elderPasscode"
                type={showPasscode ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="new-password"
                value={elderPasscode}
                onChange={(e) => setElderPasscode(e.target.value)}
                placeholder="6–20 digits"
                maxLength={20}
                required
                className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 text-lg outline-none focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
              />
            </div>

            <div>
              <label htmlFor="confirmPasscode" className="mb-2 block font-semibold">
                Confirm passcode
              </label>
              <input
                id="confirmPasscode"
                type={showPasscode ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="Enter the same passcode again"
                maxLength={20}
                required
                className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 text-lg outline-none focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="text-sm font-semibold text-[#00606B] underline"
            >
              {showPasscode ? 'Hide passcodes' : 'Show passcodes'}
            </button>

            <label className="flex items-start gap-3 rounded-xl bg-[#FFFCF7] p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[#00606B]"
              />
              <span>
                I confirm that I am 18 years of age or older and am authorised to create this household.
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-14 w-full rounded-xl bg-[#00606B] px-5 py-3 text-lg font-bold text-white hover:bg-[#004F58] disabled:opacity-60"
            >
              {loading ? 'Creating household...' : 'Create household'}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have a household?{' '}
          <a href="/login" className="font-semibold text-[#00606B] underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
