import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ImagePicker from './ImagePicker.vue';
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

  it('accepts golden unit records for stored inventory', () => {
    const form = { ...emptyItemForm(), name: 'Stock board', total_quantity: 1, location: { warehouse: 'W', section: '', pack: '' }, repairments: [{ status: 'golden', serial_num: 'SN-1' }] };
    expect(validateItemForm(form)).toEqual({});
    expect(JSON.parse(toItemFormData(form).get('repairments'))[0]).toMatchObject({ status: 'golden', serial_num: 'SN-1' });
  });

  it('uses entered item serial numbers for generated unit repairments when row serials are blank', () => {
    const form = {
      ...emptyItemForm(), name: 'Stock board', total_quantity: 2,
      serialNumText: 'SN-1, SN-2',
      repairments: [{ status: 'golden', serial_num: '' }, { status: 'golden', serial_num: '' }]
    };

    const body = toItemFormData(form);
    expect(JSON.parse(body.get('serial_num'))).toEqual(['SN-1', 'SN-2']);
    expect(JSON.parse(body.get('repairments')).map((unit) => unit.serial_num)).toEqual(['SN-1', 'SN-2']);
  });

  it('requires only warehouse for stored items', () => {
    const form = {
      ...emptyItemForm(), name: 'Board', part_num: 'B-1', stored: true,
      location: { warehouse: 'W1', section: '', pack: 'P1' }
    };
    expect(validateItemForm(form, [], 0)).toEqual({});

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
  it('does not add golden units when a new item is stored', async () => {
    const wrapper = mount(ItemForm, { props: { initialItem: emptyItemForm(), creationMode: true } });
    await wrapper.get('[value="stored"]').setValue();
    await wrapper.get('[name="name"]').setValue('Stock controller');
    await wrapper.get('[name="warehouse"]').setValue('W1');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0].form.repairments).toEqual([]);
  });

  it('shows only serial number and status for golden units on the new item page', () => {
    const wrapper = mount(ItemForm, {
      props: {
        initialItem: {
          ...emptyItemForm(),
          repairments: [{ status: 'golden', serial_num: 'SN-1' }]
        },
        creationMode: true
      }
    });

    expect(wrapper.find('[name="serial_num"]').exists()).toBe(true);
    expect(wrapper.find('[name="repairment_status"]').exists()).toBe(true);
    expect(wrapper.find('[placeholder="2026-09-07, 2026-09-08"]').exists()).toBe(false);
    expect(wrapper.find('[placeholder="Name one, Name two"]').exists()).toBe(false);
    expect(wrapper.find('[placeholder="Replaced the damaged regulator"]').exists()).toBe(false);
    expect(wrapper.find('[placeholder="R1:2.50, C4:1.20"]').exists()).toBe(false);
  });

  it('preserves active images when mapping an item for editing', () => {
    const form = itemToForm({ images: [
      { _id: 'active-image', path: '/active.png' },
      { _id: 'deleted-image', path: '/deleted.png', deleted: true }
    ] });
    expect(form.images.map((image) => image._id)).toEqual(['active-image']);
  });

  it('serializes the active image order for an item edit', () => {
    const body = toItemFormData(emptyItemForm(), [], [], ['image-2', 'image-1']);
    expect(JSON.parse(body.get('imageOrder'))).toEqual(['image-2', 'image-1']);
  });

  it('emits reordered ids and soft-delete ids from the image picker', async () => {
    const wrapper = mount(ImagePicker, { props: { existingImages: [
      { _id: 'image-1', path: '/one.png', originalName: 'one.png' },
      { _id: 'image-2', path: '/two.png', originalName: 'two.png' }
    ] } });
    await wrapper.get('[aria-label="Move one.png later"]').trigger('click');
    await wrapper.get('[aria-label="Soft delete one.png"]').trigger('click');
    expect(wrapper.emitted('change').at(-1)[0]).toMatchObject({
      imageOrder: ['image-2'], removeImageIds: ['image-1'], retainedImageCount: 1
    });
  });

  it('shows examples for item and repairment unit text fields', async () => {
    const wrapper = mount(ItemForm, { props: { initialItem: emptyItemForm(), creationMode: true } });
    const expectExamples = () => {
      for (const field of wrapper.findAll('input:not([type="radio"]):not([type="file"]), textarea')) {
        expect(field.attributes('placeholder')).toBeTruthy();
      }
    };
    expectExamples();
    await wrapper.get('[value="delivered"]').setValue();
    expectExamples();
    await wrapper.get('[value="under_repair"]').setValue();
    expectExamples();
  });

  it('offers existing item values as autocomplete suggestions', async () => {
    const wrapper = mount(ItemForm, {
      props: { initialItem: emptyItemForm(), suggestions: { name: ['Controller'], organization: ['Lab'] } }
    });

    await wrapper.get('[name="name"]').trigger('focus');
    expect(wrapper.find('.autocomplete-options button').text()).toBe('Controller');
    await wrapper.get('[name="organization"]').trigger('focus');
    expect(wrapper.findAll('.autocomplete-options button').some((button) => button.text() === 'Lab')).toBe(true);
  });

  it('does not show a repairment count in the item form', () => {
    const wrapper = mount(ItemForm, {
      props: {
        initialItem: {
          ...emptyItemForm(),
          repairments: [{ _id: 'repair-1', status: 'repairing' }, { _id: 'repair-2', status: 'repaired' }]
        }
      }
    });

    expect(wrapper.find('[data-testid="repairment-count"]').exists()).toBe(false);
  });

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

  it('allows update notes on under-repair items in edit mode', async () => {
    const wrapper = mount(ItemForm, {
      props: { initialItem: { ...emptyItemForm(), name: 'Controller', under_repairment: true, stored: true, location: { warehouse: 'lab', section: '', pack: '' } }, busy: false }
    });

    await wrapper.get('[name="new_update"]').setValue('Checked after repair');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it.each([
    ['stored', { stored: true, location: { warehouse: 'W1', section: 'S1', pack: 'P1' } }],
    ['delivered', { stored: false, delivered_to: 'Assembly' }],
    ['under repair', { stored: true, under_repairment: true, location: { warehouse: 'lab', section: '', pack: '' } }]
  ])('allows update notes for %s items', async (_state, itemState) => {
    const wrapper = mount(ItemForm, {
      props: { initialItem: { ...emptyItemForm(), name: 'Controller', ...itemState }, busy: false }
    });

    await wrapper.get('[name="new_update"]').setValue('Added a note');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toHaveLength(1);
  });
});
