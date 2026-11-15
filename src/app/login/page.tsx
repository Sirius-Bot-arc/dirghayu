
'use client';

import Logo from '@/components/Logo';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const router = useRouter();

  const [householdId, setHouseholdId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          householdId: householdId.trim(),
          passcode,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.error?.message || 'Unable to sign in. Please try again.'
        );
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-5 py-10 text-[#26352D]">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo variant="lockup" className="w-64 max-w-full" />
        </div>

        <section className="rounded-3xl border border-[#E9DFCF] bg-white p-7 shadow-lg sm:p-9">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D81B60]">
              Welcome to Dirghayu
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Welcome back!
            </h1>

            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Sign in to access your personal care space.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="householdId"
                className="mb-2 block text-base font-semibold"
              >
                Household ID
              </label>

              <input
                id="householdId"
                type="text"
                value={householdId}
                onChange={(event) => setHouseholdId(event.target.value)}
                placeholder="Enter your household ID"
                maxLength={64}
                required
                autoComplete="username"
                className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 text-lg outline-none transition focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
              />
            </div>

            <div>
              <label
                htmlFor="passcode"
                className="mb-2 block text-base font-semibold"
              >
                Passcode
              </label>

              <div className="relative">
                <input
                  id="passcode"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  placeholder="Enter your passcode"
                  maxLength={100}
                  required
                  autoComplete="current-password"
                  className="min-h-14 w-full rounded-xl border border-[#D8CCBB] bg-[#FFFCF7] px-4 pr-20 text-lg outline-none transition focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20"
                />

                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-2 text-sm font-semibold text-[#00606B] hover:bg-[#E8F1F1]"
                >
                  {showPasscode ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-800"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-14 w-full rounded-xl bg-[#00606B] px-5 py-3 text-lg font-bold text-white transition hover:bg-[#004F58] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#D69E36]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm leading-relaxed text-gray-500">
            Your care. Your choices. Your dignity.
          </p>
        </section>
        <div className="mt-6 text-center text-base text-gray-600">
  New to Dirghayu?{' '}
  <a
    href="/setup"
    className="font-bold text-[#00606B] underline"
  >
    Create a household
  </a>
</div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Dirghayu · Care with dignity
        </p>
      </div>
    </main>
  );
}

