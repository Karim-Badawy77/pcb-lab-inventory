import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemDetailPage from './ItemDetailPage.vue';
import DeleteItemDialog from '@/features/item-detail/DeleteItemDialog.vue';
import ImageGallery from '@/features/item-detail/ImageGallery.vue';
import { apiRequest } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiRequest: vi.fn() }));

const detail = {
  _id: 'item-1', name: 'Motor Controller', part_num: 'PCB-042', stored: true,
  location: { warehouse: 'W1', section: 'S2', pack: 'P3' }, category: 'Control', owner: 'Karim',
  description: 'Three-phase controller', tags: ['motor'], updates: [{ _id: 'u1', text: 'Checked', createdAt: '2026-08-30T10:00:00Z' }],
  images: [
    { _id: 'img-1', path: '/uploads/front.webp', originalName: 'front.webp' },
    { _id: 'img-2', path: '/uploads/back.webp', originalName: 'back.webp' }
  ],
  dates: { created: '2026-08-29T10:00:00Z', modified: '2026-08-30T10:00:00Z' },
  history: [{ _id: 'h1', date: '2026-08-29T10:00:00Z', from: null, to: { warehouse: 'W1', section: 'S2', pack: 'P3' }, new_item: true }]
};

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/items', component: { template: '<p>inventory</p>' } },
      { path: '/items/:id', component: ItemDetailPage }
    ]
  });
}

describe('ItemDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the item, edits it, and refreshes transaction history', async () => {
    const refreshed = { ...detail, description: 'Updated', history: [...detail.history, { _id: 'h2', date: '2026-08-31T10:00:00Z', from: detail.location, to: { warehouse: 'W1', section: 'S2', pack: 'P4' } }] };
    apiRequest.mockResolvedValueOnce(detail).mockResolvedValueOnce([]).mockResolvedValueOnce({ ...detail, description: 'Updated' }).mockResolvedValueOnce(refreshed).mockResolvedValueOnce([]);
    const router = testRouter();
    await router.push('/items/item-1');
    await router.isReady();
    const wrapper = mount(ItemDetailPage, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('Motor Controller');
    expect(wrapper.text()).toContain('W1 / S2 / P3');
    expect(wrapper.get('.gallery-main img').attributes('src')).toBe('/uploads/front.webp');
    expect(wrapper.text()).toContain('Added to inventory');

    await wrapper.get('[data-testid="edit-item"]').trigger('click');
    await wrapper.get('[name="description"]').setValue('Updated');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(apiRequest).toHaveBeenCalledWith('/api/items/item-1', { method: 'PATCH', body: expect.any(FormData) });
    expect(apiRequest).toHaveBeenLastCalledWith('/api/repairments/item/item-1');
    expect(wrapper.text()).toContain('Updated');
    expect(wrapper.text()).toContain('P4');
    wrapper.unmount();
  });

  it('shows a retry state when item loading fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Item unavailable')).mockResolvedValueOnce(detail).mockResolvedValueOnce([]);
    const router = testRouter();
    await router.push('/items/item-1');
    const wrapper = mount(ItemDetailPage, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.text()).toContain('Item unavailable');
    await wrapper.get('[data-testid="retry-detail"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Motor Controller');
  });

  it('soft deletes only after the exact name and returns to inventory', async () => {
    apiRequest.mockResolvedValueOnce(detail).mockResolvedValueOnce([]).mockResolvedValueOnce({ ...detail, deleted: true });
    const router = testRouter();
    await router.push('/items/item-1');
    await router.isReady();
    const wrapper = mount(ItemDetailPage, { attachTo: document.body, global: { plugins: [router] } });
    await flushPromises();
    await wrapper.get('[data-testid="open-delete"]').trigger('click');
    await wrapper.get('[name="confirm_name"]').setValue('Motor Controller');
    await wrapper.get('[data-testid="confirm-delete"]').trigger('click');
    await flushPromises();

    expect(apiRequest).toHaveBeenCalledWith('/api/items/item-1', { method: 'DELETE' });
    expect(router.currentRoute.value.fullPath).toBe('/items');
    wrapper.unmount();
  });

  it('keeps a failed delete open with its server message', async () => {
    apiRequest.mockResolvedValueOnce(detail).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Delete failed'));
    const router = testRouter();
    await router.push('/items/item-1');
    const wrapper = mount(ItemDetailPage, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.get('[data-testid="open-delete"]').trigger('click');
    await wrapper.get('[name="confirm_name"]').setValue('Motor Controller');
    await wrapper.get('[data-testid="confirm-delete"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Delete failed');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="confirm-delete"]').attributes('disabled')).toBeUndefined();
  });
});

describe('ImageGallery', () => {
  it('switches images and restores focus when its lightbox closes', async () => {
    const wrapper = mount(ImageGallery, { attachTo: document.body, props: { images: detail.images, itemName: detail.name } });
    await wrapper.get('[aria-label="Show image 2"]').trigger('click');
    expect(wrapper.get('.gallery-main img').attributes('src')).toBe('/uploads/back.webp');

    const opener = wrapper.get('[data-testid="open-lightbox"]');
    opener.element.focus();
    await opener.trigger('click');
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener.element);
    wrapper.unmount();
  });
});

describe('DeleteItemDialog', () => {
  it('requires the exact item name and closes with Escape while idle', async () => {
    const wrapper = mount(DeleteItemDialog, { props: { item: detail, busy: false, error: '' } });
    const confirm = wrapper.get('[data-testid="confirm-delete"]');
    expect(confirm.attributes('disabled')).toBeDefined();
    await wrapper.get('[name="confirm_name"]').setValue('motor controller');
    expect(confirm.attributes('disabled')).toBeDefined();
    await wrapper.get('[name="confirm_name"]').setValue('Motor Controller');
    expect(confirm.attributes('disabled')).toBeUndefined();
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
