import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RepairmentCard from './RepairmentCard.vue';

describe('RepairmentCard', () => {
  it('presents the repairment as a navigable queue card', () => {
    const wrapper = mount(RepairmentCard, {
      props: { repairment: { _id: 'repair-1', serial_num: 'SN-42', status: 'repairing' } },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } } }
    });

    expect(wrapper.get('.repairment-card').classes()).toContain('repairment-card--repairing');
    expect(wrapper.text()).toContain('SN-42');
    expect(wrapper.get('.repairment-card__arrow').attributes('aria-hidden')).toBe('true');
  });
});
