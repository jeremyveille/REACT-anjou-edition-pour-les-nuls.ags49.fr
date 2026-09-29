import { pathForView, resolvePublicRoute } from './publicRouting';

test('keeps media selection in shareable URLs', () => {
  expect(pathForView({ type: 'flipbooks', selectedId: 'book 1' })).toBe('/flipbooks?id=book%201');
  expect(resolvePublicRoute('/flipbooks/', '?id=book%201')).toEqual({ type: 'flipbooks', selectedId: 'book 1' });
  expect(resolvePublicRoute('/videos', '?id=clip')).toEqual({ type: 'videos', selectedId: 'clip' });
});

test('resolves custom pages with canonical, existing and encoded slugs', () => {
  const page = { id: 'page1', slug: '/pages/poésie-angevine' };
  const pathname = pathForView({ type: 'custom-page', page });
  expect(resolvePublicRoute(pathname, '', { pages: [page] })).toEqual({ type: 'custom-page', page });
  expect(resolvePublicRoute('/poésie-angevine/', '', { pages: [page] })).toEqual({ type: 'custom-page', page });
});

test('waits for content before declaring a deep link missing', () => {
  expect(resolvePublicRoute('/articles/new', '', { loading: true })).toEqual({ type: 'loading' });
  expect(resolvePublicRoute('/articles/new', '')).toEqual({ type: 'not-found', path: '/articles/new' });
  expect(resolvePublicRoute('/malformed-%E0%A4%A', '')).toEqual({ type: 'not-found', path: '/malformed-%E0%A4%A' });
});

test('restores a text reader and preview from their URLs', () => {
  const data = { title: 'Une ode' };
  expect(resolvePublicRoute('/textes/ODE', '', { texts: { ODE: data } })).toEqual({ type: 'text', categoryName: 'ODE', data });
  expect(resolvePublicRoute('/', '?preview=true&pageId=one')).toEqual({ type: 'preview', pageId: 'one' });
});
