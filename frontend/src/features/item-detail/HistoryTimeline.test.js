import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HistoryTimeline from './HistoryTimeline.vue';

describe('HistoryTimeline', () => {
  it('lists history from newest to oldest', () => {
    const wrapper = mount(HistoryTimeline, {
      props: { history: [
        { _id: 'old', date: '2026-08-01T10:00:00Z', new_item: true, to: { stored: true } },
        { _id: 'new', date: '2026-09-01T10:00:00Z', new_item: true, to: { stored: true } }
      ] }
    });

    expect(wrapper.findAll('li')[0].get('time').attributes('datetime')).toBe('2026-09-01T10:00:00Z');
    expect(wrapper.findAll('li')[1].get('time').attributes('datetime')).toBe('2026-08-01T10:00:00Z');
  });
});
