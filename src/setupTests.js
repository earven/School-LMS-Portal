// src/setupTests.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('virtual:pwa-register/react', () => {
  return {
    useRegisterSW: vi.fn(() => ({
      offlineReady: [false, vi.fn()],
      needRefresh: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    })),
  };
});