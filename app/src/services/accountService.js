import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const displayAccount = account => ({
  ...account,
  role: account.role === 'admin' ? 'Administrateur' : 'Membre',
  status: account.disabled ? 'Inactif' : 'Actif'
});
const call = async data => (await httpsCallable(functions, 'manageAccount')(data)).data;

export const accountService = {
  async list() {
    const accounts = [];
    let pageToken;
    do {
      const result = await call({ action: 'list', ...(pageToken ? { pageToken } : {}) });
      accounts.push(...result.accounts.map(displayAccount));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return accounts;
  },
  async create({ name, email, role, status }) {
    const result = await call({ action: 'create', name, email, role: role === 'Administrateur' ? 'admin' : 'member', disabled: status === 'Inactif' });
    return displayAccount(result.account);
  },
  async update(id, changes) {
    const result = await call({ action: 'update', id, ...changes });
    return displayAccount(result.account);
  },
  async remove(id) { await call({ action: 'delete', id }); },
  async resetLink(id) { return (await call({ action: 'resetLink', id })).resetLink; }
};
