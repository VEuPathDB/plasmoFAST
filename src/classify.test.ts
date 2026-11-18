import { getCategory } from './classify';

describe('getCategory', () => {
  test('returns lowCoverage when total reads < 30', () => {
    expect(getCategory(15, 14)).toBe('lowCoverage');
  });

  test('returns lowCoverage when total is exactly 29', () => {
    expect(getCategory(29, 0)).toBe('lowCoverage');
  });

  test('returns specific when >= 90% of reads are specific (exactly 30 total)', () => {
    expect(getCategory(27, 3)).toBe('specific'); // 90% specific
  });

  test('returns specific when > 90% of reads are specific', () => {
    expect(getCategory(28, 3)).toBe('specific'); // ~90.3%
  });

  test('returns nonspecific when <= 10% of reads are specific (exactly 30 total)', () => {
    expect(getCategory(3, 27)).toBe('nonspecific'); // 10% specific
  });

  test('returns nonspecific when < 10% of reads are specific', () => {
    expect(getCategory(2, 28)).toBe('nonspecific'); // ~6.7%
  });

  test('returns mixed when between 10% and 90% specific', () => {
    expect(getCategory(15, 15)).toBe('mixed'); // 50%
  });

  test('returns mixed just above 10% threshold', () => {
    expect(getCategory(4, 30)).toBe('mixed'); // ~11.8%
  });

  test('returns mixed just below 90% threshold', () => {
    expect(getCategory(26, 4)).toBe('mixed'); // ~86.7%
  });

  test('returns specific when all reads are specific', () => {
    expect(getCategory(100, 0)).toBe('specific');
  });

  test('returns nonspecific when no reads are specific', () => {
    expect(getCategory(0, 100)).toBe('nonspecific');
  });
});
