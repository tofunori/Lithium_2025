import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FacilityStatusBadge from '@/components/FacilityStatusBadge.vue';

describe('FacilityStatusBadge.vue', () => {
  it('renders N/A when no status is provided', () => {
    const wrapper = mount(FacilityStatusBadge);
    expect(wrapper.text()).toBe('N/A');
    expect(wrapper.find('span').classes()).toContain('status-badge');
    expect(wrapper.find('span').classes().length).toBe(1); // Only base class
  });

  it('renders the correct status text', () => {
    const status = 'Operating';
    const wrapper = mount(FacilityStatusBadge, {
      props: { status }
    });
    expect(wrapper.text()).toBe(status);
  });

  it('applies the correct class for "Operating" status', () => {
    const wrapper = mount(FacilityStatusBadge, {
      props: { status: 'Operating' }
    });
    expect(wrapper.find('span').classes()).toContain('status-operating');
  });

  it('applies the correct class for "Under Construction" status', () => {
    const wrapper = mount(FacilityStatusBadge, {
      props: { status: 'Under Construction' }
    });
    expect(wrapper.find('span').classes()).toContain('status-construction');
  });

  it('applies the correct class for "Planned" status', () => {
    const wrapper = mount(FacilityStatusBadge, {
      props: { status: 'Planned' }
    });
    expect(wrapper.find('span').classes()).toContain('status-planned');
  });

  it('applies the correct class for "Pilot" status', () => {
    const wrapper = mount(FacilityStatusBadge, {
      props: { status: 'Pilot' }
    });
    expect(wrapper.find('span').classes()).toContain('status-pilot');
  });

  it('applies only the base class for an unknown status', () => {
    const wrapper = mount(FacilityStatusBadge, {
      props: { status: 'Unknown Status' }
    });
    expect(wrapper.find('span').classes()).toContain('status-badge');
    expect(wrapper.find('span').classes().length).toBe(1); // Only base class
  });

  it('handles lowercase status correctly', () => {
    const wrapper = mount(FacilityStatusBadge, {
      props: { status: 'operating' }
    });
    expect(wrapper.find('span').classes()).toContain('status-operating');
  });
});