'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const defaultSettings = {
  heroTitleLine1: "Spend less time editing,",
  heroTitleLine2: "More time living.",
  heroSubtitle: "Empower your creative storytelling with high-fidelity, ultra-premium scripts, plugins, and sound libraries crafted for professional creators.",
  bundleTitle: "ALL IN ONE CREVO SUITE",
  bundlePrice: 195,
  bundleOriginalPrice: 370,
  bundleBadge: "⚡ Value $370+ for cheap ⚡",
  bundleItems: [
    "All Premium Plugins",
    "Visual Transitions Pack",
    "Cinematic SFX & Audio",
    "Free Lifetime Updates"
  ],
  featuredProductIds: [],
  bioTitle: "WHO IS ASIM?",
  bioText1: "Hey, I'm Asim Mansoory. Over the past several years, I've worked as a full-time video editor, VFX artist, and developer building automation pipelines for agencies and major content channels.",
  bioText2: "This store is a curation of all the tools, scripts, presets, and overlays that I built for myself to solve actual workflow bottlenecks. Every asset is refined to save you time and help you focus on the creative side of storytelling.",
  bioImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=500&h=500",
  faqs: [
    {
      q: "What software are these assets compatible with?",
      a: "Our plugins and scripts are specifically built for Adobe After Effects and Premiere Pro. Presets, LUTs, and audio files are compatible with all major editing software, including DaVinci Resolve and Final Cut Pro."
    },
    {
      q: "Do I get lifetime free updates?",
      a: "Yes! Once you purchase an asset, any future updates, bug fixes, or compatibility patches will be available for you to download for free, forever."
    },
    {
      q: "How do I receive my downloads after purchasing?",
      a: "Immediately after checkout, you will receive an email with instant download links. You can also access your downloads directly from your dashboard if you created an account."
    },
    {
      q: "Can I use these assets for commercial projects?",
      a: "Absolutely. All our products come with a royalty-free commercial license, meaning you can use them in client projects, YouTube videos, movies, and advertising without paying royalties."
    },
    {
      q: "How does the Adobe Extension DRM licensing work?",
      a: "For products requiring licensing (like our premium extensions), a unique license key is generated upon purchase. You'll input this key inside the extension to unlock features."
    }
  ],
  testimonials: [
    {
      name: "Jack Roberts",
      handle: "@jackedits_vfx",
      text: "This pack literally saved me 15 hours of work on my latest commercial project. The transitions are incredibly smooth, and the rendering speed is top-notch! 10/10."
    },
    {
      name: "Maya Lin",
      handle: "@maya_creatives",
      text: "The VFX presets are insane! I was a bit skeptical at first, but they are so easy to drag and drop. My clients have already noticed a huge bump in quality."
    },
    {
      name: "Samuel Cooper",
      handle: "@cooper_films",
      text: "Best investment I've made for my channel this year. The 3D text packs look so premium and render natively in After Effects without needing third-party plugins."
    },
    {
      name: "Elena Rostova",
      handle: "@elena_vlogtech",
      text: "I love the color grading LUTs. They give that clean cinematic look instantly. Also, customer support helped me resolve a license key issue in 5 minutes!"
    },
    {
      name: "Daniel Kim",
      handle: "@daniel_k_media",
      text: "Outstanding quality. As a professional motion designer, I have high standards, and these assets hit the mark perfectly. Extremely well organized."
    },
    {
      name: "Sarah Jenkins",
      handle: "@jenkins_post",
      text: "The audio transitions and sound design library alone are worth the price. They integrate seamlessly with the visual elements for maximum impact."
    }
  ],
  reviews: [
    { author: "Alex M.", rating: 5, text: "Unbelievable quality. Saved so much time!" },
    { author: "David K.", rating: 5, text: "Excellent customer service, very responsive." },
    { author: "Jessie L.", rating: 5, text: "The plugin works flawlessly in After Effects 2026." },
    { author: "Brandon S.", rating: 5, text: "Worth every penny. The asset library is massive." },
    { author: "Sophia R.", rating: 5, text: "Clean, organized, and super fast rendering." },
    { author: "Marcus G.", rating: 5, text: "The tutorials included were extremely helpful." }
  ]
};

type StoreContextType = {
  products: any[];
  initialLoading: boolean;
  homepageSettings: any;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<any[]>([]);
  const [homepageSettings, setHomepageSettings] = useState<any>(defaultSettings);
  const [loadingStates, setLoadingStates] = useState({
    products: true,
    settings: true
  });

  const initialLoading = loadingStates.products || loadingStates.settings;

  useEffect(() => {
    // Listen to products in real-time
    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, products: false }));
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoadingStates(prev => ({ ...prev, products: false }));
    });

    // Listen to homepage settings
    const unsubSettings = onSnapshot(doc(db, "settings", "homepage"), (snap) => {
      if (snap.exists()) {
        setHomepageSettings({ ...defaultSettings, ...snap.data() });
      } else {
        setHomepageSettings(defaultSettings);
      }
      setLoadingStates(prev => ({ ...prev, settings: false }));
    }, (error) => {
      console.error("Error fetching homepage settings:", error);
      // Fail gracefully so page still loads with default values
      setLoadingStates(prev => ({ ...prev, settings: false }));
    });

    // Safety net: force loading to false after 5s if Firebase is slow/unreachable (e.g. on mobile)
    const loadingTimeout = setTimeout(() => {
      setLoadingStates({ products: false, settings: false });
    }, 5000);

    return () => {
      unsubProducts();
      unsubSettings();
      clearTimeout(loadingTimeout);
    };
  }, []);

  return (
    <StoreContext.Provider value={{ products, initialLoading, homepageSettings }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
