import { useCallback, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';

export async function hasAdminClaim(user) {
  if (!user) return false;
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}

const removeLocal = key => {
  try { localStorage.removeItem(key); } catch (_) { /* Session remains usable with storage disabled. */ }
};

export default function useAdminSession() {
  const [session, setSession] = useState({ user: null, isAdmin: false, loading: true });
  const revision = useRef(0);

  useEffect(() => {
    removeLocal('ae_authenticated');
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      const current = ++revision.current;
      setSession({ user: null, isAdmin: false, loading: true });
      try {
        const isAdmin = await hasAdminClaim(user);
        if (revision.current === current) setSession({ user, isAdmin, loading: false });
      } catch {
        if (revision.current === current) setSession({ user: null, isAdmin: false, loading: false });
      }
    }, () => {
      revision.current += 1;
      setSession({ user: null, isAdmin: false, loading: false });
    });
    return () => { revision.current += 1; unsubscribe(); };
  }, []);

  const login = useCallback(async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!(await hasAdminClaim(credential.user))) {
      await signOut(auth);
      const error = new Error('Ce compte ne dispose pas des droits administrateur.');
      error.code = 'auth/insufficient-permission';
      throw error;
    }
    return credential.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    revision.current += 1;
    removeLocal('ae_authenticated');
    ['ae_accounts', 'contact_messages', 'ae_audit_logs', 'ae_pages', 'ae_articles'].forEach(removeLocal);
    setSession({ user: null, isAdmin: false, loading: false });
  }, []);

  return { ...session, login, logout };
}
