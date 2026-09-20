import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RepairmentForm from './RepairmentForm.vue';

describe('RepairmentForm', () => {
  it('renders existing repairment values as autocomplete suggestions', () => {
    const wrapper = mount(RepairmentForm, {
      props: { suggestions: { serial_num: ['SN-1'], repairer: ['Amina'], spare_part: ['R1:2'] } }
    });

    expect(wrapper.find('input[name="serial_num"]').attributes('list')).toBe('repairment-serial-num-options');
    expect(wrapper.find('#repairment-serial-num-options option').attributes('value')).toBe('SN-1');
    expect(wrapper.find('#repairment-repairer-options option').attributes('value')).toBe('Amina');
  });

  it.each(['repairing', 'awaiting_spare_part', 'repaired', 'unrepairable'])('submits an update note when status is %s', async (status) => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status } } });
    await wrapper.get('[name="update"]').setValue('Progress note');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')[0][0].updates).toEqual([{ text: 'Progress note' }]);
  });
});
