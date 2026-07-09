'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

type AdminContextType = {
  products: any[];
  leads: any[];
  customers: any[];
  licenses: any[];
  promocodes: any[];
  customLinks: any[];
  articles: any[];
  initialLoading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  
  const [products, setProducts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [customLinks, setCustomLinks] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  
  // Track loading state for each collection
  const [loadingStates, setLoadingStates] = useState({
    products: true,
    leads: true,
    customers: true,
    licenses: true,
    promocodes: true,
    customLinks: true,
    articles: true
  });

  const initialLoading = Object.values(loadingStates).some(state => state === true);

  useEffect(() => {
    // We only attach listeners if there's a user AND they are an admin
    if (!user || !isAdmin) {
      // If not admin, stop loading immediately
      setLoadingStates({
        products: false,
        leads: false,
        customers: false,
        licenses: false,
        promocodes: false,
        customLinks: false,
        articles: false
      });
      return;
    }

    const unsubs: (() => void)[] = [];

    // Products
    unsubs.push(onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, products: false }));
    }));

    // Leads (Orders)
    unsubs.push(onSnapshot(query(collection(db, "leads"), orderBy("createdAt", "desc")), (snap) => {
      setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, leads: false }));
    }));

    // Customers
    unsubs.push(onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, customers: false }));
    }));

    // Licenses
    unsubs.push(onSnapshot(collection(db, "licenses"), (snap) => {
      setLicenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, licenses: false }));
    }));

    // Promocodes
    unsubs.push(onSnapshot(collection(db, "promocodes"), (snap) => {
      setPromocodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, promocodes: false }));
    }));

    // Custom Links
    unsubs.push(onSnapshot(collection(db, 'custom_links'), (snapshot) => {
      setCustomLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, customLinks: false }));
    }));

    // Articles
    unsubs.push(onSnapshot(query(collection(db, 'articles'), orderBy('createdAt', 'desc')), (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, articles: false }));
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, isAdmin]);

  return (
    <AdminContext.Provider value={{ products, leads, customers, licenses, promocodes, customLinks, articles, initialLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
