import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { expect, jest } from '@jest/globals';

global.fetch = jest.fn();

// Mock import.meta.env
global.import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://mock-supabase-url.com',
      VITE_SUPABASE_ANON_KEY: 'example-anon-key',
    },
  },
};

// Set environment variables directly on process.env
process.env.VITE_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.VITE_SUPABASE_ANON_KEY = 'example-anon-key';

// Mock document if not already available
if (typeof document === 'undefined') {
  global.document = {
    body: {},
    createElement: () => ({}),
    querySelector: () => null,
  };
}
