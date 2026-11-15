import { beforeAll, afterAll, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }),
  headers: () => new Headers()
}));

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  credential: {
    applicationDefault: vi.fn(),
    cert: vi.fn()
  },
  firestore: {
    Timestamp: {
      now: () => ({ toDate: () => new Date() }),
      fromDate: (d: Date) => ({ toDate: () => d })
    },
    FieldValue: {
      serverTimestamp: () => new Date(),
      arrayUnion: vi.fn(),
      arrayRemove: vi.fn(),
      increment: vi.fn()
    }
  }
}));

// Mock @google/generative-ai
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({})
        }
      })
    })
  }))
}));

// Global test timeout
vi.setConfig({ testTimeout: 10000 });