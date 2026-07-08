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
  initialLoading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [products, setProducts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [customLinks, setCustomLinks] = useState<any[]>([]);
  
  // Track loading state for each collection
  const [loadingStates, setLoadingStates] = useState({
    products: true,
    leads: true,
    customers: true,
    licenses: true,
    promocodes: true,
    customLinks: true
  });

  const initialLoading = Object.values(loadingStates).some(state => state === true);

  useEffect(() => {
    // We only attach listeners if there's a user, otherwise we don't fetch admin data
    // (Actual permission checking should happen in Firestore Rules or layout router)
    if (!user) return;

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
    unsubs.push(onSnapshot(collection(db, "custom_links"), (snap) => {
      setCustomLinks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStates(prev => ({ ...prev, customLinks: false }));
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  return (
    <AdminContext.Provider value={{ products, leads, customers, licenses, promocodes, customLinks, initialLoading }}>
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
