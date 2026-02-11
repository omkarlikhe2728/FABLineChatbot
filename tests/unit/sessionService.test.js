const sessionService = require('../../src/services/sessionService');

describe('SessionService', () => {
  const userId = 'test_user_123';

  // Clean up after each test
  afterEach(async () => {
    await sessionService.deleteSession(userId);
  });

  test('createSession - creates new session', async () => {
    const session = await sessionService.createSession(userId);
    expect(session.userId).toBe(userId);
    expect(session.dialogState).toBe('MAIN_MENU');
    expect(session.attributes).toEqual({});
    expect(session.createdAt).toBeDefined();
    expect(session.lastActivity).toBeDefined();
  });

  test('getSession - retrieves existing session', async () => {
    await sessionService.createSession(userId);
    const session = await sessionService.getSession(userId);
    expect(session).not.toBeNull();
    expect(session.userId).toBe(userId);
  });

  test('getSession - returns null for non-existent session', async () => {
    const session = await sessionService.getSession('non_existent_user');
    expect(session).toBeNull();
  });

  test('updateDialogState - updates state', async () => {
    await sessionService.createSession(userId);
    await sessionService.updateDialogState(userId, 'CHECK_BALANCE');
    const session = await sessionService.getSession(userId);
    expect(session.dialogState).toBe('CHECK_BALANCE');
  });

  test('updateAttributes - updates attributes', async () => {
    await sessionService.createSession(userId);
    await sessionService.updateAttributes(userId, { phone: '+919876543210' });
    const session = await sessionService.getSession(userId);
    expect(session.attributes.phone).toBe('+919876543210');
  });

  test('updateAttributes - merges with existing attributes', async () => {
    await sessionService.createSession(userId);
    await sessionService.updateAttributes(userId, { phone: '+919876543210' });
    await sessionService.updateAttributes(userId, { isAuthenticated: true });
    const session = await sessionService.getSession(userId);
    expect(session.attributes.phone).toBe('+919876543210');
    expect(session.attributes.isAuthenticated).toBe(true);
  });

  test('updateLastActivity - updates timestamp', async () => {
    await sessionService.createSession(userId);
    const session1 = await sessionService.getSession(userId);
    const firstTime = session1.lastActivity;

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 10));
    await sessionService.updateLastActivity(userId);
    const session2 = await sessionService.getSession(userId);
    const secondTime = session2.lastActivity;

    expect(secondTime).toBeGreaterThan(firstTime);
  });

  test('deleteSession - removes session', async () => {
    await sessionService.createSession(userId);
    await sessionService.deleteSession(userId);
    const session = await sessionService.getSession(userId);
    expect(session).toBeNull();
  });

  test('getSessionData - returns copy of session', async () => {
    await sessionService.createSession(userId);
    await sessionService.updateAttributes(userId, { phone: '+919876543210' });
    const data = await sessionService.getSessionData(userId);
    expect(data).not.toBeNull();
    expect(data.userId).toBe(userId);
    expect(data.attributes.phone).toBe('+919876543210');
  });
});
