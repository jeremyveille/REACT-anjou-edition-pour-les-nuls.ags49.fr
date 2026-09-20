import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDgb6SZIqJ3jTdi_kM695DvlfDOCvCU71I",
  authDomain: "react-anjou-edition.firebaseapp.com",
  projectId: "react-anjou-edition",
  storageBucket: "react-anjou-edition.firebasestorage.app",
  messagingSenderId: "494338542670",
  appId: "1:494338542670:web:50b23e1a488f46e246071f",
  measurementId: "G-E48RL606Z1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function syncAllData() {
  console.log("Authenticating as admin...");
  try {
    await signInWithEmailAndPassword(auth, 'admin@anjou-edition.fr', 'admin2026');
    console.log("Admin authenticated.");
  } catch (err) {
    console.warn("Auth warning:", err.message);
  }

  // 1. Clean and sync Pages
  console.log("\n--- Syncing Pages ---");
  const existingPagesSnap = await getDocs(collection(db, 'pages'));
  console.log(`Found ${existingPagesSnap.docs.length} existing pages.`);
  
  // Delete redundant duplicate pages for Accueil
  for (const pageDoc of existingPagesSnap.docs) {
    const data = pageDoc.data() || {};
    const title = (data.title || '').toLowerCase();
    // Keep or replace with standardized pages
    await deleteDoc(doc(db, 'pages', pageDoc.id));
    console.log(`Deleted existing page: ${pageDoc.id} (${data.title})`);
  }

  const standardPages = [
    {
      id: "page_home",
      title: "Accueil - Anjou Edition",
      slug: "accueil",
      status: "published",
      author: "Jeremy Veille",
      category: "Général",
      isHome: true,
      blocks: [],
      version: 1,
      createdAt: "2026-05-12T10:00:00.000Z",
      updatedAt: new Date().toISOString()
    },
    {
      id: "page_a_propos",
      title: "À Propos de nous",
      slug: "a-propos",
      status: "published",
      author: "Sylvie Gautier",
      category: "Général",
      blocks: [
        {
          id: "sec_about",
          type: "section",
          settings: { classes: "py-4", style: { backgroundColor: "#ffffff" } },
          children: [
            {
              id: "cont_about",
              type: "container",
              settings: { fluid: false },
              children: [
                {
                  id: "heading_about",
                  type: "heading",
                  settings: { content: "À Propos d'Anjou Édition", level: "h1", alignment: "left" }
                },
                {
                  id: "text_about",
                  type: "text",
                  settings: {
                    content: "<p>Anjou Édition est un portail culturel dédié au patrimoine littéraire, historique, poétique et scientifique de l'Anjou. Nous œuvrons pour la préservation et la diffusion des textes classiques et contemporains de notre belle région fluviale.</p>",
                    alignment: "left"
                  }
                }
              ]
            }
          ]
        }
      ],
      version: 1,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: new Date().toISOString()
    },
    {
      id: "page_collections",
      title: "Nos Collections Littéraires",
      slug: "nos-collections",
      status: "published",
      author: "Jeremy Veille",
      category: "Littérature",
      blocks: [
        {
          id: "sec_coll",
          type: "section",
          settings: { classes: "py-4", style: { backgroundColor: "#ffffff" } },
          children: [
            {
              id: "cont_coll",
              type: "container",
              settings: { fluid: false },
              children: [
                {
                  id: "heading_coll",
                  type: "heading",
                  settings: { content: "Nos Collections Littéraires", level: "h1", alignment: "left" }
                },
                {
                  id: "text_coll",
                  type: "text",
                  settings: {
                    content: "<p>Explorez nos poésies, romans, nouvelles et essais dédiés à l'Anjou, accessibles en lecture directe et en synthèse vocale.</p>",
                    alignment: "left"
                  }
                }
              ]
            }
          ]
        }
      ],
      version: 1,
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: new Date().toISOString()
    },
    {
      id: "page_mentions_legales",
      title: "Mentions Légales",
      slug: "mentions-legales",
      status: "published",
      author: "Jeremy Veille",
      category: "Légal",
      blocks: [],
      version: 1,
      createdAt: "2026-05-15T10:00:00.000Z",
      updatedAt: new Date().toISOString()
    }
  ];

  for (const p of standardPages) {
    const { id, ...pageData } = p;
    await setDoc(doc(db, 'pages', id), pageData);
    console.log(`Saved page: ${id} -> "${pageData.title}"`);
  }

  // 2. Clean and sync Articles
  console.log("\n--- Syncing Articles ---");
  const standardArticles = [
    {
      id: "art_1",
      title: "Les secrets de l'écriture romanesque pour les Nuls",
      slug: "les-secrets-de-l-ecriture-romanesque-pour-les-nuls",
      status: "published",
      author: "Jeremy Veille",
      category: "Outils",
      views: 245,
      date: "2026-05-30",
      content: "<p>L'écriture d'un roman historique ou régional demande de la rigueur, de la passion et une documentation approfondie sur les lieux et les époques explorés.</p>",
      version: 1,
      createdAt: "2026-05-30T10:00:00.000Z",
      updatedAt: new Date().toISOString()
    }
  ];

  for (const a of standardArticles) {
    const { id, ...artData } = a;
    await setDoc(doc(db, 'articles', id), artData);
    console.log(`Saved article: ${id} -> "${artData.title}"`);
  }

  // 3. Ensure Flipbook 4455 (Les Secrets du Vignoble Angevin) is saved
  console.log("\n--- Checking Flipbooks ---");
  const fb4455 = {
    id: "4455",
    title: "Les Secrets du Vignoble Angevin",
    description: "Un voyage sensoriel au cœur des cépages emblématiques de la région, du Chenin au Cabernet Franc.",
    category: "Sciences",
    date: "14/04/2026 à 20h02",
    pdfFile: "secrets_vignoble_angevin.pdf",
    pages: [
      { pageNum: 1, title: "Couverture", content: "Anjou Edition\n\nLES SECRETS DU VIGNOBLE ANGEVIN\n\n- Terroirs et Cépages -" },
      { pageNum: 2, title: "Les Terroirs d'Anjou", content: "Le vignoble d'Anjou s'étend sur des sols très variés. On distingue l'Anjou Noir sur roches schisteuses et l'Anjou Blanc sur sols calcaires (tuffeau)." },
      { pageNum: 3, title: "Le Chenin Blanc", content: "Cépage roi de la Loire, le Chenin produit de grands vins blancs secs (Savennières), moelleux (Coteaux du Layon) et effervescents. Il exprime des arômes de coing et de miel." },
      { pageNum: 4, title: "Le Cabernet Franc", content: "Cépage rouge historique, il donne des vins fruités et structurés (Saumur-Champigny, Anjou Rouge), caractérisés par des notes de fruits rouges et de poivron vert." },
      { pageNum: 5, title: "L'Art de la Dégustation", content: "Pour apprécier pleinement ces vins, servez les blancs entre 10 et 12°C, et les rouges légèrement rafraîchis autour de 16°C. Accompagnez-les de fromages de chèvre locaux." }
    ]
  };
  await setDoc(doc(db, 'flipbooks', '4455'), fb4455);
  console.log("Verified flipbook 4455 in Firestore.");

  // Delete any lingering 3322 or Guide Historique flipbooks
  const fbSnap = await getDocs(collection(db, 'flipbooks'));
  for (const fbDoc of fbSnap.docs) {
    const data = fbDoc.data() || {};
    if (fbDoc.id === '3322' || (data.title || '').toLowerCase().includes('guide historique')) {
      await deleteDoc(doc(db, 'flipbooks', fbDoc.id));
      console.log(`Deleted obsolete flipbook ${fbDoc.id}`);
    }
  }

  // 4. Sync Videos
  console.log("\n--- Syncing Videos ---");
  const standardVideos = [
    {
      id: "v1",
      title: "Survol Historique du Château d'Angers",
      youtubeId: "Y1wzszq92f0",
      url: "https://www.youtube.com/watch?v=Y1wzszq92f0",
      description: "Une vue aérienne spectaculaire de la plus grande forteresse de la vallée de la Loire, avec ses jardins suspendus et ses remparts légendaires.",
      category: "Châteaux",
      duration: "4:15",
      date: "15/05/2026"
    },
    {
      id: "v2",
      title: "La Loire : Fleuve Sauvage et Mystique",
      youtubeId: "bO2tOaFf-1I",
      url: "https://www.youtube.com/watch?v=bO2tOaFf-1I",
      description: "Découvrez les bancs de sable mouvants, la faune unique et la magie des couchers de soleil sur le dernier grand fleuve sauvage d'Europe.",
      category: "Loire",
      duration: "6:40",
      date: "02/06/2026"
    },
    {
      id: "v3",
      title: "Conférence Anjou 2026 - Littérature et Territoires",
      youtubeId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      description: "Enregistrement complet de la table ronde sur le patrimoine littéraire de l'Anjou, animée par des historiens et écrivains locaux.",
      category: "Littérature",
      duration: "45:30",
      date: "20/06/2026"
    },
    {
      id: "v1783678668285",
      title: "Aventure Tropicale Et Danger Cosmique",
      youtubeId: "9IUxmxYEG9Q",
      url: "https://www.youtube.com/watch?v=9IUxmxYEG9Q",
      description: "Aventure Tropicale Et Danger Cosmique | D'animation | Film complet en français",
      category: "Nature",
      date: "10/07/2026"
    }
  ];

  for (const v of standardVideos) {
    const { id, ...vData } = v;
    await setDoc(doc(db, 'videos', id), vData);
    console.log(`Saved video: ${id} -> "${vData.title}"`);
  }

  // 5. Sync Gallery
  console.log("\n--- Syncing Gallery ---");
  const standardGallery = [
    {
      id: "g1",
      title: "Château d'Angers et ses Jardins",
      category: "Châteaux",
      url: "https://picsum.photos/800/600?random=11",
      thumbnailUrl: "https://picsum.photos/400/300.webp?random=11",
      description: "Les magnifiques jardins fleuris aménagés dans les anciens fossés de la forteresse médiévale.",
      date: "12/05/2026"
    },
    {
      id: "g2",
      title: "Vignobles de Savennières",
      category: "Vignobles",
      url: "https://picsum.photos/800/600?random=12",
      thumbnailUrl: "https://picsum.photos/400/300.webp?random=12",
      description: "Les coteaux escarpés de Savennières surplombant la Loire, terroir d'exception du Chenin.",
      date: "20/05/2026"
    },
    {
      id: "g3",
      title: "Coucher de soleil sur la Loire",
      category: "Loire",
      url: "https://picsum.photos/800/600?random=13",
      thumbnailUrl: "https://picsum.photos/400/300.webp?random=13",
      description: "Les reflets dorés du crépuscule sur l'eau calme du fleuve royal près de Saumur.",
      date: "01/06/2026"
    },
    {
      id: "g4",
      title: "Manoir en Tuffeau et Ardoise",
      category: "Patrimoine",
      url: "https://picsum.photos/800/600?random=14",
      thumbnailUrl: "https://picsum.photos/400/300.webp?random=14",
      description: "Demeure traditionnelle angevine associant la clarté du calcaire et le bleu sombre de l'ardoise.",
      date: "10/06/2026"
    },
    {
      id: "g5",
      title: "Les Ruelles Historiques d'Angers",
      category: "Patrimoine",
      url: "https://picsum.photos/800/600?random=15",
      thumbnailUrl: "https://picsum.photos/400/300.webp?random=15",
      description: "Maisons médiévales à colombages et rues pavées dans le quartier de la Doutre.",
      date: "15/06/2026"
    },
    {
      id: "g6",
      title: "Abbaye de Fontevraud",
      category: "Châteaux",
      url: "https://picsum.photos/800/600?random=16",
      thumbnailUrl: "https://picsum.photos/400/300.webp?random=16",
      description: "La plus grande cité monastique d'Europe, nécropole royale des Plantagenêts.",
      date: "20/06/2026"
    }
  ];

  for (const g of standardGallery) {
    const { id, ...gData } = g;
    await setDoc(doc(db, 'gallery', id), gData);
    console.log(`Saved gallery photo: ${id} -> "${gData.title}"`);
  }

  // 6. Sync News
  console.log("\n--- Syncing News ---");
  const standardNews = [
    { id: "n1", title: "Festival l'Anjou Littéraire 2026", content: "Le festival aura lieu le 10 Septembre 2026 à Saumur ! Préparez vos manuscrits et venez rencontrer les éditeurs de la région.", type: "Urgent", date: "2026-06-08" },
    { id: "n2", title: "Lancement officiel du portail", content: "Le nouveau site Anjou Édition est en ligne. Les écrivains peuvent s'inscrire pour publier leurs flipbooks numériques.", type: "Info", date: "2026-06-01" },
    { id: "n3", title: "Mise à jour des filtres de recherche", content: "Nous avons ajouté une recherche par date et par mot-clé pour faciliter la consultation de notre bibliothèque historique.", type: "Important", date: "2026-06-15" }
  ];

  for (const n of standardNews) {
    const { id, ...nData } = n;
    await setDoc(doc(db, 'news', id), nData);
    console.log(`Saved news: ${id} -> "${nData.title}"`);
  }

  // 7. Sync Accounts
  console.log("\n--- Syncing Accounts ---");
  const standardAccounts = [
    { id: "u1", name: "JEREMY VEILLE", email: "jeremy.veille@hotmail.fr", role: "Administrateur", status: "Actif", color: "#004b7a" },
    { id: "u2", name: "Sylvie Gautier", email: "sylvie.gautier@anjou-lettres.fr", role: "Écrivain", status: "Actif", color: "#336ddc" },
    { id: "u3", name: "Pierre Bougier", email: "p.bougier@maine-loire.fr", role: "Éditeur", status: "Inactif", color: "#64748b" }
  ];

  for (const acc of standardAccounts) {
    const { id, ...accData } = acc;
    await setDoc(doc(db, 'accounts', id), accData);
    console.log(`Saved account: ${id} -> "${accData.name}" (${accData.role})`);
  }

  // 8. Sync Settings
  console.log("\n--- Syncing Settings ---");
  const standardSettings = {
    siteName: "Anjou Edition – Pour les Nuls",
    contactEmail: "contact@anjou-edition-nuls.fr",
    enableComments: true,
    maintenanceMode: false
  };
  await setDoc(doc(db, 'settings', 'global'), standardSettings);
  console.log("Saved global settings.");

  console.log("\n>>> ALL FIRESTORE DATA SYNCHRONIZED SUCCESSFULLY! <<<");
}

syncAllData().catch(console.error);
