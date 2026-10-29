import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RepairmentForm from './RepairmentForm.vue';

describe('RepairmentForm', () => {
  it('shows examples for empty repairment text fields', async () => {
    const wrapper = mount(RepairmentForm);
    const textFields = wrapper.findAll('input, textarea');
    expect(textFields.length).toBeGreaterThan(0);
    for (const field of textFields) expect(field.attributes('placeholder')).toBeTruthy();

    await wrapper.get('[name="status"]').setValue('delivered');
    for (const field of wrapper.findAll('input, textarea')) expect(field.attributes('placeholder')).toBeTruthy();
  });

  it('offers existing repairment values as autocomplete suggestions', async () => {
    const wrapper = mount(RepairmentForm, {
      props: { suggestions: { serial_num: ['SN-1'], repairer: ['Amina'], spare_part: ['R1:2'] } }
    });

    await wrapper.get('input[name="serial_num"]').trigger('focus');
    expect(wrapper.find('.autocomplete-options button').text()).toBe('SN-1');
    await wrapper.get('input[name="repairer"]').trigger('focus');
    expect(wrapper.findAll('.autocomplete-options button').some((button) => button.text() === 'Amina')).toBe(true);
  });

  it('submits an edited serial number', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing', serial_num: 'SN-OLD' } } });
    await wrapper.get('[name="serial_num"]').setValue('SN-NEW');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')[0][0].serial_num).toBe('SN-NEW');
  });

  it('edits repaired independently from the repairment status', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing', repaired: true } } });
    expect(wrapper.get('[name="repaired"]').element.checked).toBe(true);
    await wrapper.get('[name="repaired"]').setValue(false);
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')[0][0]).toMatchObject({ status: 'repairing', repaired: false });
  });

  it('shows and submits the repairment owner', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing', owner: 'Karim' } } });
    expect(wrapper.get('[name="owner"]').element.value).toBe('Karim');
    await wrapper.get('[name="owner"]').setValue('Mona');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0].owner).toBe('Mona');
  });

  it('edits golden independently and retains the status dropdown', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing' } } });
    expect(wrapper.find('[name="status"]').exists()).toBe(true);
    expect(wrapper.find('[name="status"] option[value="golden"]').exists()).toBe(false);
    await wrapper.get('[name="golden"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({ status: 'repairing', golden: true });
  });

  it('rejects a repairment that is both repaired and golden', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing' } } });
    await wrapper.get('[name="repaired"]').setValue(true);
    await wrapper.get('[name="golden"]').setValue(true);
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.get('[role="alert"]').text()).toContain('cannot be both repaired and golden');
  });

  it('aligns repaired and golden checkboxes in one flags section', () => {
    const wrapper = mount(RepairmentForm);
    expect(wrapper.get('[data-testid="repairment-flags"]').findAll('input[type="checkbox"]')).toHaveLength(2);
  });

  it('shows only serial number and status fields for a golden unit', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing' } } });
    await wrapper.get('[name="golden"]').setValue(true);
    expect(wrapper.find('[name="serial_num"]').exists()).toBe(true);
    expect(wrapper.find('[name="status"]').exists()).toBe(true);
    for (const field of ['delivered_to', 'delivered_by', 'field_test_date', 'repairer', 'spare_part', 'update']) {
      expect(wrapper.find(`[name="${field}"]`).exists()).toBe(false);
    }
  });

  it.each(['repairing', 'awaiting_spare_part', 'repaired', 'unrepairable'])('submits an update note when status is %s', async (status) => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status } } });
    await wrapper.get('[name="update"]').setValue('Progress note');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')[0][0].updates).toEqual([{ text: 'Progress note' }]);
  });
});
