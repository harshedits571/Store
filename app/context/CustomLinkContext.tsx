'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSearchParams } from 'next/navigation';

type CustomLinkData = {
  id: string;
  active: boolean;
  products: string[];
  pricingMode: 'discount' | 'fixed';
  discountPercent: number;
  fixedPrices: Record<string, { inr: number; usd: number }>;
  maxRedemptions: number;
  currentRedemptions: number;
  note?: string;
  expiresAt?: any;
};

type CustomLinkContextType = {
  activeCustomLink: CustomLinkData | null;
  loadingLink: boolean;
  applyCustomPrice: (productId: string, currentPrice: number, currency: 'USD' | 'INR') => number;
  applyCouponCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCouponCode: () => void;
};

const CustomLinkContext = createContext<CustomLinkContextType>({ 
  activeCustomLink: null, 
  loadingLink: false,
  applyCustomPrice: (id, price) => price,
  applyCouponCode: async () => ({ success: false }),
  removeCouponCode: () => {}
});

export function CustomLinkProvider({ children }: { children: ReactNode }) {
  const [activeCustomLink, setActiveCustomLink] = useState<CustomLinkData | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchCustomLink = async () => {
      // Check URL for ?ref= param first
      let refCode = searchParams.get('ref');
      
      // If not in URL, check session storage in case they navigated to another page
      if (!refCode) {
        refCode = typeof window !== 'undefined' ? sessionStorage.getItem('custom_link_ref') : null;
      }

      if (!refCode) {
        setActiveCustomLink(null);
        setLoadingLink(false);
        return;
      }

      try {
        const cleanCode = refCode.toUpperCase();
        const docRef = doc(db, 'custom_links', cleanCode);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as CustomLinkData;
          
          // Validate the link
          let isValid = true;
          
          if (!data.active) {
            console.warn(`[Custom Link] ${cleanCode} is inactive`);
            isValid = false;
          }
          
          if (data.maxRedemptions > 0 && (data.currentRedemptions || 0) >= data.maxRedemptions) {
            console.warn(`[Custom Link] ${cleanCode} has reached max redemptions`);
            isValid = false;
          }
          
          // TODO: Check expiresAt if you add expiration date logic

          if (isValid) {
            setActiveCustomLink(data);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('custom_link_ref', cleanCode);
            }
          } else {
            setActiveCustomLink(null);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('custom_link_ref');
            }
          }
        } else {
          console.warn(`[Custom Link] ${cleanCode} not found in database`);
          setActiveCustomLink(null);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('custom_link_ref');
          }
        }
      } catch (err) {
        console.error("Error fetching custom link", err);
        setActiveCustomLink(null);
      }
      setLoadingLink(false);
    };

    fetchCustomLink();
  }, [searchParams]);

  const applyCustomPrice = (productId: string, currentPrice: number, currency: 'USD' | 'INR') => {
    if (!activeCustomLink) return currentPrice;

    if (activeCustomLink.products.length > 0 && !activeCustomLink.products.includes(productId)) {
      return currentPrice;
    }

    if (activeCustomLink.pricingMode === 'discount') {
      return currentPrice * (1 - (activeCustomLink.discountPercent / 100));
    } else if (activeCustomLink.pricingMode === 'fixed') {
      const fixed = activeCustomLink.fixedPrices[productId];
      if (fixed) {
        return currency === 'INR' ? fixed.inr : fixed.usd;
      }
    }
    return currentPrice;
  };

  const applyCouponCode = async (code: string) => {
    try {
      const cleanCode = code.trim().toUpperCase();
      const docRef = doc(db, 'custom_links', cleanCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as CustomLinkData;
        
        let isValid = true;
        let errorMessage = "";
        
        if (!data.active) {
          isValid = false;
          errorMessage = "This coupon is inactive.";
        }
        
        if (data.maxRedemptions > 0 && (data.currentRedemptions || 0) >= data.maxRedemptions) {
          isValid = false;
          errorMessage = "This coupon has reached its maximum usage limit.";
        }
        
        if (isValid) {
          setActiveCustomLink(data);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('custom_link_ref', cleanCode);
          }
          return { success: true };
        } else {
          return { success: false, error: errorMessage };
        }
      } else {
        return { success: false, error: "Invalid coupon code." };
      }
    } catch (err) {
      console.error("Error applying coupon", err);
      return { success: false, error: "An error occurred while applying the coupon." };
    }
  };

  const removeCouponCode = () => {
    setActiveCustomLink(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('custom_link_ref');
    }
  };

  return (
    <CustomLinkContext.Provider value={{ activeCustomLink, loadingLink, applyCustomPrice, applyCouponCode, removeCouponCode }}>
      {children}
    </CustomLinkContext.Provider>
  );
}

export function useCustomLink() {
  return useContext(CustomLinkContext);
}
