import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllItems } from './api';
import { filterItems, formatLocation, primaryImage, uniqueFilterOptions } from './inventory';

const items = [
  {
    _id: '1', name: 'Motor Controller', part_num: 'PCB-042', description: 'Three phase', owner: 'Karim',
    category: 'Control', tags: ['motor'], stored: true,
    location: { warehouse: 'W1', section: 'S2', pack: 'P3' }, images: [{ path: '/uploads/a.webp' }]
  },
  {
    _id: '2', name: 'Sensor Board', part_num: 'SNS-018', description: '', owner: 'Mona',
    category: 'Sensor', tags: ['analog'], stored: false, delivered_to: 'Assembly'
  }
];

beforeEach(() => { window.APP_CONFIG = { API_BASE_URL: 'http://localhost:3000' }; });
afterEach(() => { delete window.APP_CONFIG; });

describe('inventory filtering and display helpers', () => {
  it('combines normalized search and filters', () => {
    expect(filterItems(items, {
      query: ' pcb-042 ', status: 'stored', category: 'Control', warehouse: 'W1', tag: 'motor'
    })).toEqual([items[0]]);
    expect(filterItems(items, {
      query: 'ANALOG', status: 'all', category: '', warehouse: '', tag: ''
    })).toEqual([items[1]]);
  });

  it('derives stable display values and filter options', () => {
    expect(formatLocation(items[0])).toBe('W1 / S2 / P3');
    expect(formatLocation(items[1])).toBe('Assembly');
    expect(primaryImage(items[0])).toBe('http://localhost:3000/uploads/a.webp');
    expect(primaryImage(items[1])).toBe('');
    expect(uniqueFilterOptions(items)).toEqual({
      categories: ['Control', 'Sensor'], warehouses: ['W1'], tags: ['analog', 'motor']
    });
  });
});

describe('inventory API pagination', () => {
  it('loads every API page with a limit of 100', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { items: [{ _id: '1' }], total: 2, page: 1, limit: 100 } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { items: [{ _id: '2' }], total: 2, page: 2, limit: 100 } })
      });

    await expect(fetchAllItems(fetchImpl)).resolves.toEqual([{ _id: '1' }, { _id: '2' }]);
    expect(fetchImpl).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/items?page=1&limit=100', expect.any(Object));
    expect(fetchImpl).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/items?page=2&limit=100', expect.any(Object));
  });

  it('surfaces the API error message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'Inventory unavailable' })
    });
    await expect(fetchAllItems(fetchImpl)).rejects.toThrow('Inventory unavailable');
  });
});
