import { describe, expect, it } from 'vitest';
import { apiBaseUrl, apiUrl, assetUrl } from './config';

describe('same-origin API URLs', () => {
  it('uses relative paths for API and assets', () => {
    expect(apiBaseUrl()).toBe('');
    expect(apiUrl('/api/items')).toBe('/api/items');
    expect(assetUrl('https://cdn.example.test/board.webp')).toBe('https://cdn.example.test/board.webp');
  });
});
