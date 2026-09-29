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

  it('offers golden as an add and edit status and submits it', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing' } } });
    expect(wrapper.find('[name="status"] option[value="golden"]').exists()).toBe(true);
    await wrapper.get('[name="status"]').setValue('golden');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')[0][0].status).toBe('golden');
  });

  it('shows only serial number and status fields for a golden unit', async () => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status: 'repairing' } } });
    await wrapper.get('[name="status"]').setValue('golden');
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
