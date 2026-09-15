import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from './StatusBadge.vue';

describe('StatusBadge', () => {
  it('shows repairing before stored when an item is under repair', () => {
    const wrapper = mount(StatusBadge, { props: { stored: true, underRepairment: true } });

    expect(wrapper.text()).toContain('Repairing');
    expect(wrapper.classes()).toContain('status-badge--repairing');
  });
});
