const canonicalPath = (path = '/') => {
  try {
    return decodeURIComponent(path).replace(/\/+$/, '') || '/';
  } catch (_) {
    return path;
  }
};

const contentSlug = (item) => String(item.slug || item.id || '').replace(/^\/?(?:pages|articles)\//, '').replace(/^\/+|\/+$/g, '');

export function pathForView(view) {
  switch (view.type) {
    case 'home': return '/';
    case 'dashboard': return '/ae-dashboard';
    case 'custom-page': return `/pages/${encodeURIComponent(contentSlug(view.page))}`;
    case 'article': return `/articles/${encodeURIComponent(contentSlug(view.article))}`;
    case 'text': return `/textes/${encodeURIComponent(view.categoryName)}`;
    case 'preview': return `/?preview=true${view.pageId ? `&pageId=${encodeURIComponent(view.pageId)}` : ''}`;
    case 'flipbooks':
    case 'videos': return `/${view.type}${view.selectedId ? `?id=${encodeURIComponent(view.selectedId)}` : ''}`;
    case 'not-found': return view.path || '/page-introuvable';
    default: return `/${view.type}`;
  }
}

export function resolvePublicRoute(pathname, search, { articles = [], pages = [], texts = {}, loading = false } = {}) {
  const path = canonicalPath(pathname);
  const params = new URLSearchParams(search);
  if (params.get('preview') === 'true') return { type: 'preview', pageId: params.get('pageId') };
  const routes = {
    '/': 'home', '/home': 'home', '/accueil': 'home',
    '/ae-dashboard': 'dashboard', '/contact': 'contact',
    '/privacy': 'privacy', '/politique-de-confidentialite': 'privacy',
    '/gallery': 'gallery', '/galerie': 'gallery',
    '/flipbooks': 'flipbooks', '/videos': 'videos'
  };
  if (routes[path]) return { type: routes[path], selectedId: params.get('id') || undefined };
  if (path.startsWith('/textes/')) {
    const categoryName = path.slice('/textes/'.length);
    if (texts[categoryName]) return { type: 'text', categoryName, data: texts[categoryName] };
  }
  if (path.startsWith('/articles/')) {
    const slug = path.slice('/articles/'.length);
    const article = articles.find(item => contentSlug(item) === slug || String(item.id) === slug);
    if (article) return { type: 'article', article };
  } else {
    const slug = path.replace(/^\/(?:pages\/)?/, '');
    const page = pages.find(item => contentSlug(item) === slug || String(item.id) === slug);
    if (page) return { type: 'custom-page', page };
  }
  return loading ? { type: 'loading' } : { type: 'not-found', path };
}
