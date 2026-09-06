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

describe('AppShell footer', () => {
  it('links the developer credit to the WhatsApp account', () => {
    const wrapper = mount(AppShell, { global: { stubs: { RouterLink: true, RouterView: true } } });

    const developerLink = wrapper.get('.developer-credit a');

    expect(wrapper.get('.developer-credit').text()).toBe('This application was developed by K.Badawy');
    expect(developerLink.text()).toBe('K.Badawy');
    expect(developerLink.attributes()).toMatchObject({
      href: 'https://wa.me/201025175196',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });
});

describe('AppShell brand', () => {
  it('shows the PCB logo instead of the text badge', () => {
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          RouterView: true,
        },
      },
    });

    const logo = wrapper.get('.brand-mark img');

    expect(logo.attributes()).toMatchObject({
      src: '/assets/PCB Logo2.png',
      alt: 'PCB LAB logo',
    });
    expect(wrapper.get('.brand-mark').text()).toBe('');
  });
});
