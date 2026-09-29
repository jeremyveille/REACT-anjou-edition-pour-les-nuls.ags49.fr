import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PageBuilder from './PageBuilder';
import { pageService } from '../../services/pageService';

jest.mock('../../services/pageService', () => ({ pageService: { getPages: jest.fn(), savePage: jest.fn() } }));
jest.mock('./BuilderSidebar', () => ({ BuilderSidebar: () => null }));
jest.mock('./IframePreview', () => ({ IframePreview: () => null }));
jest.mock('../MediaLibraryModal', () => ({ MediaLibraryModal: () => null }));
jest.mock('./BuilderCanvas', () => ({
  BuilderCanvas: ({ blocks, onRemoveBlock }) => <div>{blocks.map(block => <button key={block.id} onClick={() => onRemoveBlock(block.id)}>Supprimer le bloc de test</button>)}</div>
}));

const page = {
  id: 'page-1', title: 'Page originale', slug: 'page-originale', status: 'draft', category: 'Outils',
  blocks: [{ id: 'block-1', type: 'heading', settings: { content: 'Texte initial' }, children: [] }]
};
const nextPage = { ...page, id: 'page-2', title: 'Page suivante', slug: 'page-suivante' };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.history.pushState(null, '', '/ae-dashboard/builder');
  window.alert = jest.fn();
  window.confirm = jest.fn(() => true);
  pageService.getPages.mockImplementation(collection => Promise.resolve(collection === 'pages' ? [page, nextPage] : []));
  pageService.savePage.mockResolvedValue({ id: page.id });
});

async function openBuilder(props = {}) {
  render(<PageBuilder editingId={page.id} {...props} />);
  return screen.findByPlaceholderText(/Titre de la page/i);
}

async function requestNextPage() {
  fireEvent.click(screen.getByTestId('content-selector-btn'));
  fireEvent.click(await screen.findByRole('option', { name: /Page suivante/i }));
  return screen.findByRole('dialog', { name: /Modifications non enregistrées/i });
}

test.each(['title', 'blocks'])('both save paths reject an empty %s and keep the current document', async invalid => {
  const title = await openBuilder();
  if (invalid === 'title') fireEvent.change(title, { target: { value: '   ' } });
  else fireEvent.click(screen.getByRole('button', { name: 'Supprimer le bloc de test' }));
  fireEvent.keyDown(window, { key: 's', ctrlKey: true });
  expect(pageService.savePage).not.toHaveBeenCalled();
  const dialog = await requestNextPage();
  fireEvent.click(within(dialog).getByRole('button', { name: /Enregistrer et continuer/i }));
  expect(pageService.savePage).not.toHaveBeenCalled();
  expect(dialog).toBeInTheDocument();
  expect(screen.getByTestId('content-selector-btn')).toHaveTextContent('Page originale');
});

test('a failed save-and-continue retains content and allows retry before navigation', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  const onSaveSuccess = jest.fn();
  const title = await openBuilder({ onSaveSuccess });
  fireEvent.change(title, { target: { value: 'Travail précieux' } });
  pageService.savePage.mockRejectedValueOnce(new Error('offline'));
  const dialog = await requestNextPage();
  fireEvent.click(within(dialog).getByRole('button', { name: /Enregistrer et continuer/i }));
  await waitFor(() => expect(window.alert).toHaveBeenCalled());
  expect(dialog).toBeInTheDocument();
  expect(title).toHaveValue('Travail précieux');
  expect(onSaveSuccess).not.toHaveBeenCalled();
  await waitFor(() => expect(within(dialog).getByRole('button', { name: /Enregistrer et continuer/i })).toBeEnabled());
  fireEvent.click(within(dialog).getByRole('button', { name: /Enregistrer et continuer/i }));
  await waitFor(() => expect(title).toHaveValue('Page suivante'));
  expect(pageService.savePage).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Travail précieux' }), page.id, 'pages');
  expect(onSaveSuccess).toHaveBeenCalledTimes(1);
  errorLog.mockRestore();
});

test('repeated save shortcuts start only one request and local saves are identified clearly', async () => {
  let resolveSave;
  pageService.savePage.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));
  const title = await openBuilder();
  fireEvent.change(title, { target: { value: 'Modification' } });
  fireEvent.keyDown(window, { key: 's', ctrlKey: true });
  fireEvent.keyDown(window, { key: 's', ctrlKey: true });
  expect(pageService.savePage).toHaveBeenCalledTimes(1);
  await act(async () => resolveSave({ id: page.id, isLocalOnly: true }));
  expect(screen.getByRole('status', { name: 'Enregistrement de la page' })).toHaveTextContent('enregistré dans ce navigateur');
  expect(screen.getByRole('status', { name: 'Enregistrement de la page' })).toHaveTextContent('synchronisation distante reste à effectuer');
});

test('the unsaved dialog keeps keyboard focus, closes on Escape and preserves edits', async () => {
  const title = await openBuilder();
  fireEvent.change(title, { target: { value: 'Modification conservée' } });
  const exit = screen.getByRole('button', { name: 'Quitter le constructeur' });
  exit.focus();
  fireEvent.click(exit);
  const dialog = await screen.findByRole('dialog');
  const cancel = within(dialog).getByRole('button', { name: /^Annuler$/ });
  const save = within(dialog).getByRole('button', { name: /Enregistrer et continuer/i });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
  expect(save).toHaveFocus();
  fireEvent.keyDown(save, { key: 'Tab' });
  expect(cancel).toHaveFocus();
  fireEvent.keyDown(cancel, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(exit).toHaveFocus();
  expect(title).toHaveValue('Modification conservée');
});

test('unsaved changes cancel beforeunload, while a successful save clears the protection', async () => {
  const title = await openBuilder();
  fireEvent.change(title, { target: { value: 'Modification' } });
  const pendingEvent = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(pendingEvent);
  expect(pendingEvent.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /^Enregistrer$/ }));
  await screen.findByRole('status', { name: 'Enregistrement de la page' });
  const savedEvent = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(savedEvent);
  expect(savedEvent.defaultPrevented).toBe(false);
});

