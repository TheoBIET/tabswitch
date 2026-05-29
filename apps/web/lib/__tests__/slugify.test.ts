import { describe, expect, it } from 'vitest';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('lowercases ASCII words and joins them with hyphens', () => {
    expect(slugify('Theo Biet')).toBe('theo-biet');
  });

  it('strips combining diacritics (accents)', () => {
    expect(slugify('Théo Élise')).toBe('theo-elise');
  });

  it('treats underscores like spaces', () => {
    expect(slugify('cool_user')).toBe('cool-user');
  });

  it('collapses runs of separators', () => {
    expect(slugify('  too   many --- spaces  ')).toBe('too-many-spaces');
  });

  it('drops characters that are not [a-z0-9-]', () => {
    expect(slugify('!#hello%world?')).toBe('helloworld');
  });

  it('caps at 32 chars and trims trailing hyphens after truncation', () => {
    expect(slugify('a'.repeat(40))).toBe('a'.repeat(32));
    expect(slugify('abcdefghijklmnopqrstuvwxyz012345 extra')).toBe(
      'abcdefghijklmnopqrstuvwxyz012345',
    );
  });

  it('returns null when nothing usable remains', () => {
    expect(slugify('')).toBeNull();
    expect(slugify('   ')).toBeNull();
    expect(slugify('🙂🙃')).toBeNull();
    expect(slugify('!!!')).toBeNull();
  });

  it('returns null when the result has digits only', () => {
    expect(slugify('12345')).toBeNull();
    expect(slugify('  9 9 9 ')).toBeNull();
  });
});
