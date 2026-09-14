import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RepairmentDetailPage from './RepairmentDetailPage.vue';
import { apiRequest } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiRequest: vi.fn() }));

describe('RepairmentDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders persisted update notes in the updates section', async () => {
    apiRequest
      .mockResolvedValueOnce({ _id: 'repair-1', item_id: 'item-1', status: 'repaired', updates: [{ _id: 'u1', text: 'Verified output', createdAt: '2026-09-14T10:00:00Z' }], history: [] })
      .mockResolvedValueOnce({ history: [] });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/repairments/:id', component: RepairmentDetailPage }, { path: '/repairments/:id/edit', component: { template: '<p />' } }] });
    await router.push('/repairments/repair-1');
    await router.isReady();
    const wrapper = mount(RepairmentDetailPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.get('.detail-section:nth-of-type(3)').text()).toContain('Verified output');
  });
});
