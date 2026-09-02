import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AppShell from './AppShell.vue';
import { apiRequest } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiRequest: vi.fn() }));

describe('AppShell health check', () => {
  beforeEach(() => vi.clearAllMocks());

  it('alerts when the server responds', async () => {
    apiRequest.mockResolvedValue({ status: 'ok' });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const wrapper = mount(AppShell, { global: { stubs: { RouterLink: true, RouterView: true } } });

    await wrapper.get('[data-testid="health-check"]').trigger('click');
    await flushPromises();

    expect(apiRequest).toHaveBeenCalledWith('/api/health', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(alert).toHaveBeenCalledWith('Server is Live');
    alert.mockRestore();
  });

  it('alerts when the server does not respond', async () => {
    apiRequest.mockRejectedValue(new Error('offline'));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const wrapper = mount(AppShell, { global: { stubs: { RouterLink: true, RouterView: true } } });

    await wrapper.get('[data-testid="health-check"]').trigger('click');
    await flushPromises();

    expect(alert).toHaveBeenCalledWith('No response');
    alert.mockRestore();
  });

  it('alerts when the health check times out', async () => {
    vi.useFakeTimers();
    apiRequest.mockReturnValue(new Promise(() => {}));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const wrapper = mount(AppShell, { global: { stubs: { RouterLink: true, RouterView: true } } });

    await wrapper.get('[data-testid="health-check"]').trigger('click');
    await vi.advanceTimersByTimeAsync(5000);

    expect(alert).toHaveBeenCalledWith('No response');
    alert.mockRestore();
    vi.useRealTimers();
  });
});
