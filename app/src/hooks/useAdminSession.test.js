import { act, renderHook, waitFor } from '@testing-library/react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import useAdminSession from './useAdminSession';

jest.mock('../firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({
  onIdTokenChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn()
}));

let tokenChanged;
const user = (claims = {}) => ({ uid: 'real-user', email: 'person@example.test', getIdTokenResult: jest.fn().mockResolvedValue({ claims }) });
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  onIdTokenChanged.mockImplementation((_auth, callback) => { tokenChanged = callback; return jest.fn(); });
  signOut.mockResolvedValue();
});

test('a forged legacy local session cannot open administration', async () => {
  localStorage.setItem('ae_authenticated', 'true');
  const { result } = renderHook(() => useAdminSession());
  await act(() => tokenChanged(null));
  expect(result.current.isAdmin).toBe(false);
  expect(result.current.loading).toBe(false);
  expect(localStorage.getItem('ae_authenticated')).toBeNull();
});

test('verified admin claim grants access and token refresh removes revoked role', async () => {
  const { result } = renderHook(() => useAdminSession());
  await act(() => tokenChanged(user({ admin: true })));
  expect(result.current.isAdmin).toBe(true);
  await act(() => tokenChanged(user({ admin: false })));
  expect(result.current.isAdmin).toBe(false);
});

test('string admin claim does not grant access', async () => {
  const { result } = renderHook(() => useAdminSession());
  await act(() => tokenChanged(user({ admin: 'true' })));
  expect(result.current.isAdmin).toBe(false);
});

test('non-admin login rejects and signs the Firebase user out', async () => {
  signInWithEmailAndPassword.mockResolvedValue({ user: user() });
  const { result } = renderHook(() => useAdminSession());
  await expect(result.current.login(' member@example.test ', 'password')).rejects.toMatchObject({ code: 'auth/insufficient-permission' });
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('logout ends Firebase session and removes private cached data', async () => {
  const { result } = renderHook(() => useAdminSession());
  await act(() => tokenChanged(user({ admin: true })));
  localStorage.setItem('contact_messages', '[{"message":"private"}]');
  await act(() => result.current.logout());
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(result.current.isAdmin).toBe(false);
  expect(localStorage.getItem('contact_messages')).toBeNull();
});

test('a late token result cannot restore a session that has ended', async () => {
  let resolveToken;
  const slowUser = { getIdTokenResult: () => new Promise(resolve => { resolveToken = resolve; }) };
  const { result } = renderHook(() => useAdminSession());
  let pending;
  act(() => { pending = tokenChanged(slowUser); });
  await act(() => tokenChanged(null));
  await act(async () => { resolveToken({ claims: { admin: true } }); await pending; });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.isAdmin).toBe(false);
});
