import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the latest backup file
const files = fs.readdirSync(path.join(__dirname, '..')).filter(f => f.startsWith('firestore_backup_before_sync_'));
files.sort().reverse();
const latestBackup = files[0];
console.log(`Analyzing backup: ${latestBackup}`);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', latestBackup), 'utf-8'));

console.log("\n=== COLLECTIONS SUMMARY ===");
for (const [col, items] of Object.entries(data.collections)) {
  console.log(`${col}: ${items.length} documents`);
}

console.log("\n=== PAGES ===");
data.collections.pages.forEach(p => {
  console.log(`- ID: ${p.id} | Title: "${p.data.title}" | Slug: "${p.data.slug}" | Status: ${p.data.status} | Blocks: ${(p.data.blocks || []).length}`);
});

console.log("\n=== ARTICLES ===");
data.collections.articles.forEach(a => {
  console.log(`- ID: ${a.id} | Title: "${a.data.title}" | Slug: "${a.data.slug}" | Status: ${a.data.status}`);
});

console.log("\n=== FLIPBOOKS ===");
data.collections.flipbooks.forEach(fb => {
  console.log(`- ID: ${fb.id} | Title: "${fb.data.title}" | pdfFile: "${fb.data.pdfFile}" | category: "${fb.data.category}"`);
});

console.log("\n=== VIDEOS ===");
data.collections.videos.forEach(v => {
  console.log(`- ID: ${v.id} | Title: "${v.data.title}" | youtubeId: "${v.data.youtubeId}" | url: "${v.data.url}"`);
});

console.log("\n=== GALLERY ===");
data.collections.gallery.forEach(g => {
  console.log(`- ID: ${g.id} | Title: "${g.data.title}" | category: "${g.data.category}" | url: "${g.data.url}"`);
});

console.log("\n=== NEWS ===");
data.collections.news.forEach(n => {
  console.log(`- ID: ${n.id} | Title: "${n.data.title}" | type: "${n.data.type}" | date: "${n.data.date}"`);
});

console.log("\n=== ACCOUNTS ===");
data.collections.accounts.forEach(acc => {
  console.log(`- ID: ${acc.id} | Name: "${acc.data.name}" | Email: "${acc.data.email}" | Role: "${acc.data.role}" | Status: "${acc.data.status}"`);
});

console.log("\n=== SETTINGS ===");
data.collections.settings.forEach(s => {
  console.log(`- ID: ${s.id} | Data:`, s.data);
});

console.log("\n=== MENUS TREE (Top level items & child count) ===");
const menus = data.collections.menus.map(m => ({ id: m.id, ...m.data }));
const rootMenus = menus.filter(m => !m.parentId || m.parentId === 'null').sort((a,b) => (a.order||0) - (b.order||0));
rootMenus.forEach(rm => {
  const children = menus.filter(m => m.parentId === rm.id).sort((a,b) => (a.order||0) - (b.order||0));
  console.log(`- [Root] ID: ${rm.id} | Label: "${rm.title || rm.label}" | Type: ${rm.type} | Shortcode: "${rm.shortcode}" | Order: ${rm.order} | Children: ${children.length}`);
  children.forEach(c => {
    const grandChildren = menus.filter(m => m.parentId === c.id).sort((a,b) => (a.order||0) - (b.order||0));
    console.log(`    ├── [Child] ID: ${c.id} | Label: "${c.title || c.label}" | Shortcode: "${c.shortcode}" | Order: ${c.order} | Grandchildren: ${grandChildren.length}`);
    grandChildren.forEach(gc => {
      console.log(`        └── [Grandchild] ID: ${gc.id} | Label: "${gc.title || gc.label}" | Shortcode: "${gc.shortcode}" | Order: ${gc.order}`);
    });
  });
});
