import { describe, it, expect } from 'vitest';
import { extractDisplayDomain } from '../scanner';

describe('extractDisplayDomain', () => {
  it('extracts bare domains from visible t.co display text', () => {
    expect(extractDisplayDomain('linktr.ee/growth-kit')).toBe('linktr.ee');
    expect(extractDisplayDomain('(stan.store/creator-kit)…')).toBe('stan.store');
  });

  it('extracts domains from fully qualified URLs', () => {
    expect(extractDisplayDomain('https://amzn.to/deal?tag=abc123')).toBe('amzn.to');
    expect(extractDisplayDomain('http://beacons.ai/myprofile')).toBe('beacons.ai');
  });

  it('ignores internal X/Twitter links', () => {
    expect(extractDisplayDomain('x.com/brandonwise/status/123')).toBeNull();
    expect(extractDisplayDomain('https://twitter.com/someone/status/999')).toBeNull();
    expect(extractDisplayDomain('https://t.co/abcDEF')).toBeNull();
  });

  it('returns null for non-domain text', () => {
    expect(extractDisplayDomain('link in bio')).toBeNull();
    expect(extractDisplayDomain('')).toBeNull();
  });
});
