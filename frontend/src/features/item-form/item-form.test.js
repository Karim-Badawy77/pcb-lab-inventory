import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { emptyItemForm, itemToForm, toItemFormData, validateItemForm } from './item-form';
import ItemForm from './ItemForm.vue';

describe('item form domain', () => {
  it('serializes under-repair unit data and validates quantity cards', () => {
    const form = {
      ...emptyItemForm(), name: 'Board', stored: true, under_repairment: true, quantity: 2,
      repairments: [{ status: 'repairing' }, { status: 'repaired' }]
    };
    expect(validateItemForm(form)).toEqual({});
    const body = toItemFormData(form);
    expect(body.get('under_repairment')).toBe('true');
    expect(JSON.parse(body.get('repairments'))).toMatchObject([{ status: 'repairing' }, { status: 'repaired' }]);
  });

  it('requires a full location only for stored items', () => {
    const form = {
      ...emptyItemForm(), name: 'Board', part_num: 'B-1', stored: true,
      location: { warehouse: 'W1', section: '', pack: 'P1' }
    };
    expect(validateItemForm(form, [], 0)).toMatchObject({ 'location.section': 'Section is required' });

    form.stored = false;
    form.delivered_to = 'Assembly';
    expect(validateItemForm(form, [], 0)).toEqual({});
  });

  it('maps an item without mutating it and serializes structured fields', () => {
    const item = {
      name: 'Board', part_num: 'B-1', stored: true, tags: ['control'], updates: [{ text: 'Checked' }],
      location: { warehouse: 'W1', section: 'S1', pack: 'P1' }
    };
    const form = itemToForm(item);
    form.name = 'Changed';
    expect(item.name).toBe('Board');

    const body = toItemFormData(form, [], ['image-id']);
    expect(JSON.parse(body.get('location'))).toEqual(item.location);
    expect(JSON.parse(body.get('tags'))).toEqual(['control']);
    expect(JSON.parse(body.get('updates'))).toEqual([{ text: 'Checked' }]);
    expect(JSON.parse(body.get('removeImageIds'))).toEqual(['image-id']);
  });

  it('rejects excess, oversized, and unsupported images', () => {
    const form = { ...emptyItemForm(), name: 'Board', part_num: 'B-1', stored: false, delivered_to: 'Lab' };
    const textFile = new File(['x'], 'notes.txt', { type: 'text/plain' });
    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });

    expect(validateItemForm(form, [textFile], 10).images).toContain('maximum');
    expect(validateItemForm(form, [textFile], 0).images).toContain('JPEG, PNG, or WebP');
    expect(validateItemForm(form, [largeFile], 0).images).toContain('5 MB');
  });
});

describe('ItemForm', () => {
  it('renders under-repair unit cards with a status select', async () => {
    const wrapper = mount(ItemForm, { props: { initialItem: emptyItemForm(), busy: false, creationMode: true } });
    await wrapper.get('[value="under_repair"]').setValue();
    await wrapper.get('[name="quantity"]').setValue('2');
    expect(wrapper.findAll('[data-testid="repairment-unit"]').length).toBe(2);
    expect(wrapper.findAll('[name="repairment_status"]').length).toBe(2);
  });

  it('switches conditional fields and emits valid multipart-ready state', async () => {
    const wrapper = mount(ItemForm, { props: { initialItem: emptyItemForm(), busy: false } });
    expect(wrapper.find('[name="warehouse"]').exists()).toBe(true);
    await wrapper.get('[value="delivered"]').setValue();
    expect(wrapper.find('[name="warehouse"]').exists()).toBe(false);
    expect(wrapper.find('[name="delivered_to"]').exists()).toBe(true);

    await wrapper.get('[name="name"]').setValue('Controller');
    await wrapper.get('[name="part_num"]').setValue('PCB-1');
    await wrapper.get('[name="delivered_to"]').setValue('Assembly');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('submit')[0][0].form).toMatchObject({
      name: 'Controller', part_num: 'PCB-1', stored: false, delivered_to: 'Assembly'
    });
  });
});
