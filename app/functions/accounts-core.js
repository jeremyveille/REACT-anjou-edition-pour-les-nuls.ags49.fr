class AccountError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function accountView(user) {
  return {
    id: user.uid, name: user.displayName || '', email: user.email || '',
    role: user.customClaims?.admin === true ? 'admin' : 'member', disabled: user.disabled === true
  };
}

function validateFields(data, creating = false) {
  const fields = {};
  if (creating || data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 100) throw new AccountError('invalid-argument', 'Le nom doit comporter de 1 à 100 caractères.');
    fields.displayName = data.name.trim();
  }
  if (creating || data.email !== undefined) {
    if (typeof data.email !== 'string' || data.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) throw new AccountError('invalid-argument', 'Adresse e-mail invalide.');
    fields.email = data.email.trim().toLowerCase();
  }
  if (creating || data.disabled !== undefined) {
    if (data.disabled !== undefined && typeof data.disabled !== 'boolean') throw new AccountError('invalid-argument', 'Statut de compte invalide.');
    fields.disabled = data.disabled === true;
  }
  if (data.role !== undefined && !['admin', 'member'].includes(data.role)) throw new AccountError('invalid-argument', 'Rôle inconnu.');
  return fields;
}

function createAccountHandler({ auth, db }) {
  const mirror = user => db.collection('accounts').doc(user.uid).set(accountView(user));
  return async function manage(request) {
    if (!request.auth) throw new AccountError('unauthenticated', 'Veuillez vous connecter.');
    if (request.auth.token?.admin !== true) throw new AccountError('permission-denied', 'Droits administrateur requis.');
    const actor = await auth.getUser(request.auth.uid);
    if (actor.disabled || actor.customClaims?.admin !== true) throw new AccountError('permission-denied', 'Votre autorisation a expiré.');
    const data = request.data || {};
    if (data.action === 'list') {
      const result = await auth.listUsers(1000, data.pageToken || undefined);
      return { accounts: result.users.map(accountView), nextPageToken: result.pageToken || null };
    }
    if (data.action === 'create') {
      const fields = validateFields(data, true);
      const role = data.role || 'member';
      const created = await auth.createUser(fields);
      try {
        await auth.setCustomUserClaims(created.uid, { admin: role === 'admin' });
        const user = await auth.getUser(created.uid);
        await mirror(user);
        return { account: accountView(user) };
      } catch (error) {
        try {
          await auth.deleteUser(created.uid);
          await db.collection('accounts').doc(created.uid).delete();
        } catch {
          throw new AccountError('internal', 'Création interrompue : vérifiez ce compte dans la console Firebase avant de réessayer.');
        }
        throw error;
      }
    }
    if (!['update', 'delete', 'resetLink'].includes(data.action)) throw new AccountError('invalid-argument', 'Action inconnue.');
    if (typeof data.id !== 'string' || !data.id || data.id.length > 128) throw new AccountError('invalid-argument', 'Identifiant de compte invalide.');
    const previous = await auth.getUser(data.id);
    if (data.id === actor.uid && (data.action === 'delete' || data.disabled === true || data.role === 'member')) throw new AccountError('failed-precondition', 'Vous ne pouvez pas supprimer, désactiver ou rétrograder votre propre compte.');
    if (data.action === 'resetLink') {
      if (previous.disabled || !previous.email) throw new AccountError('failed-precondition', 'Activez ce compte et renseignez son adresse e-mail.');
      return { resetLink: await auth.generatePasswordResetLink(previous.email) };
    }
    if (data.action === 'delete') {
      await auth.revokeRefreshTokens(data.id);
      await auth.deleteUser(data.id);
      try { await db.collection('accounts').doc(data.id).delete(); }
      catch { throw new AccountError('internal', 'Le compte Firebase a été supprimé, mais sa fiche reste à nettoyer. Actualisez la liste et vérifiez la console.'); }
      return { deletedId: data.id };
    }
    const fields = validateFields(data);
    const claims = { ...previous.customClaims, ...(data.role ? { admin: data.role === 'admin' } : {}) };
    try {
      await auth.updateUser(data.id, fields);
      await auth.setCustomUserClaims(data.id, claims);
      if (data.disabled === true || data.role === 'member') await auth.revokeRefreshTokens(data.id);
      const updated = await auth.getUser(data.id);
      await mirror(updated);
      return { account: accountView(updated) };
    } catch (error) {
      try {
        await auth.updateUser(data.id, { displayName: previous.displayName || '', email: previous.email, disabled: previous.disabled });
        await auth.setCustomUserClaims(data.id, previous.customClaims || {});
        await mirror(previous);
      } catch {
        throw new AccountError('internal', 'Mise à jour interrompue : vérifiez le compte dans la console Firebase avant de réessayer.');
      }
      throw error;
    }
  };
}

module.exports = { createAccountHandler, AccountError, accountView };
