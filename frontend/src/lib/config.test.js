import { afterEach, describe, expect, it } from 'vitest';
import { apiBaseUrl, apiUrl, assetUrl } from './config';

afterEach(() => { delete window.APP_CONFIG; });

describe('runtime deployment configuration', () => {
  it('normalizes a configured API base URL', () => {
    window.APP_CONFIG = { API_BASE_URL: 'https://api.example.test/' };
    expect(apiBaseUrl()).toBe('https://api.example.test');
    expect(apiUrl('/api/items')).toBe('https://api.example.test/api/items');
    expect(assetUrl('/uploads/board.webp')).toBe('https://api.example.test/uploads/board.webp');
  });

  it('supports same-origin paths when the base is empty', () => {
    window.APP_CONFIG = { API_BASE_URL: '' };
    expect(apiUrl('/api/items')).toBe('/api/items');
    expect(assetUrl('https://cdn.example.test/board.webp')).toBe('https://cdn.example.test/board.webp');
  });
});
