import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RepairmentForm from './RepairmentForm.vue';

describe('RepairmentForm', () => {
  it.each(['repairing', 'awaiting_spare_part', 'repaired', 'unrepairable'])('submits an update note when status is %s', async (status) => {
    const wrapper = mount(RepairmentForm, { props: { initialRepairment: { status } } });
    await wrapper.get('[name="update"]').setValue('Progress note');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('submit')[0][0].updates).toEqual([{ text: 'Progress note' }]);
  });
});
