describe('Basic Setup Tests', () => {
  test('Jest should work correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('Environment variables should be available', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});