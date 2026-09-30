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
    _id: '1', name: 'Motor Controller', part_num: 'PCB-042', stored: true, organization: 'Control', tags: ['motor'],
    location: { warehouse: 'W1', section: 'S2', pack: 'P3' }, images: []
  },
  {
    _id: '2', name: 'Sensor Board', part_num: 'SNS-018', stored: false, organization: 'Sensor',
    delivered_to: 'Assembly', tags: ['sensor'], images: []
  },
  {
    _id: '3', name: 'Repair Board', part_num: 'REP-007', stored: true, under_repairment: true,
    organization: 'Control', location: { warehouse: 'lab' }, tags: ['repair'], images: []
  }
];

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('inventory-view');
  });

  it('switches between grid and list views and remembers the selection', async () => {
    fetchAllItems.mockResolvedValue(items);
    const router = testRouter();
    await router.push('/items');
    await router.isReady();
    const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
    await flushPromises();

    const inventory = wrapper.get('[data-testid="inventory-items"]');
    expect(inventory.classes()).toContain('inventory-grid');

    await wrapper.get('[data-view="list"]').trigger('click');
    expect(inventory.classes()).toContain('inventory-list');
    expect(localStorage.getItem('inventory-view')).toBe('list');

    await wrapper.get('[data-view="grid"]').trigger('click');
    expect(inventory.classes()).toContain('inventory-grid');
    expect(localStorage.getItem('inventory-view')).toBe('grid');
  });

  it('restores the saved list view', async () => {
    localStorage.setItem('inventory-view', 'list');
    fetchAllItems.mockResolvedValue(items);
    const router = testRouter();
    await router.push('/items');
    await router.isReady();
    const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.get('[data-testid="inventory-items"]').classes()).toContain('inventory-list');
    expect(wrapper.get('[data-view="list"]').attributes('aria-pressed')).toBe('true');
  });

  it('shows compact inventory rows with status and quantity in list view', async () => {
    fetchAllItems.mockResolvedValue(items);
    const router = testRouter();
    await router.push('/items');
    await router.isReady();
    const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.get('[data-view="list"]').trigger('click');

    expect(wrapper.findAll('.inventory-row')).toHaveLength(3);
    expect(wrapper.get('.inventory-row').text()).toContain('Motor Controller');
    expect(wrapper.get('.inventory-row').text()).toContain('PCB-042');
    expect(wrapper.get('.inventory-row').text()).toContain('W1 / S2 / P3');
    expect(wrapper.get('.inventory-row').text()).toContain('Stored');
    expect(wrapper.get('.inventory-row').text()).toContain('1 available');
    expect(wrapper.find('.inventory-list .card-open').exists()).toBe(false);
  });

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

  it('filters inventory items under repairment', async () => {
    fetchAllItems.mockResolvedValue(items);
    const router = testRouter();
    await router.push('/items');
    await router.isReady();
    const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.get('[data-status="repairing"]').trigger('click');

    expect(wrapper.text()).toContain('Repair Board');
    expect(wrapper.text()).not.toContain('Motor Controller');
    expect(wrapper.text()).not.toContain('Sensor Board');
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
