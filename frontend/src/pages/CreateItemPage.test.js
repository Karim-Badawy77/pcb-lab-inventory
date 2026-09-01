import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateItemPage from './CreateItemPage.vue';
import { apiRequest } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiRequest: vi.fn() }));

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items/new', component: CreateItemPage },
      { path: '/items/:id', component: { template: '<p>detail</p>' } }
    ]
  });
}

async function fillDeliveredForm(wrapper) {
  await wrapper.get('[value="delivered"]').setValue();
  await wrapper.get('[name="name"]').setValue('Controller');
  await wrapper.get('[name="part_num"]').setValue('PCB-1');
  await wrapper.get('[name="delivered_to"]').setValue('Assembly');
}

describe('CreateItemPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an item and opens its detail route', async () => {
    apiRequest.mockResolvedValue({ _id: 'new-id' });
    const router = testRouter();
    await router.push('/items/new');
    await router.isReady();
    const wrapper = mount(CreateItemPage, { global: { plugins: [router] } });
    await fillDeliveredForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(apiRequest).toHaveBeenCalledWith('/api/items', { method: 'POST', body: expect.any(FormData) });
    expect(router.currentRoute.value.fullPath).toBe('/items/new-id');
  });

  it('keeps the form visible and reports API errors', async () => {
    apiRequest.mockRejectedValue(new Error('Part number already exists'));
    const router = testRouter();
    await router.push('/items/new');
    await router.isReady();
    const wrapper = mount(CreateItemPage, { global: { plugins: [router] } });
    await fillDeliveredForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Part number already exists');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe('/items/new');
  });
});
