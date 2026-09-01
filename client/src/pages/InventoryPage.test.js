import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryPage from './InventoryPage.vue';
import { fetchAllItems } from '@/lib/api';

vi.mock('@/lib/api', () => ({ fetchAllItems: vi.fn() }));

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items', component: InventoryPage },
      { path: '/items/new', component: { template: '<p>new</p>' } },
      { path: '/items/:id', component: { template: '<p>detail</p>' } }
    ]
  });
}

const items = [
  {
    _id: '1', name: 'Motor Controller', part_num: 'PCB-042', stored: true, category: 'Control', tags: ['motor'],
    location: { warehouse: 'W1', section: 'S2', pack: 'P3' }, images: []
  },
  {
    _id: '2', name: 'Sensor Board', part_num: 'SNS-018', stored: false, category: 'Sensor',
    delivered_to: 'Assembly', tags: ['sensor'], images: []
  }
];

describe('InventoryPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads inventory and combines search with status filtering', async () => {
    fetchAllItems.mockResolvedValue(items);
    const router = testRouter();
    await router.push('/items');
    await router.isReady();
    const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('Motor Controller');
    await wrapper.get('[aria-label="Search inventory"]').setValue('sensor');
    expect(wrapper.text()).not.toContain('Motor Controller');
    expect(wrapper.text()).toContain('Sensor Board');
    await wrapper.get('[data-status="stored"]').trigger('click');
    expect(wrapper.text()).toContain('No items match');
  });

  it('shows a retry action after a loading failure', async () => {
    fetchAllItems.mockRejectedValueOnce(new Error('Inventory unavailable')).mockResolvedValueOnce(items);
    const router = testRouter();
    const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('Inventory unavailable');
    await wrapper.get('[data-testid="retry-inventory"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Motor Controller');
    expect(fetchAllItems).toHaveBeenCalledTimes(2);
  });
});
