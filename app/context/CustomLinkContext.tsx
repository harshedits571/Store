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

  // Helper: check if a code matches the homepage settings promo popup
  const checkHomepagePromo = async (cleanCode: string): Promise<CustomLinkData | null> => {
    try {
      const homeSnap = await getDoc(doc(db, 'settings', 'homepage'));
      if (homeSnap.exists()) {
        const homeData = homeSnap.data();
        const configuredCode = (homeData.promoPopupCode || 'CREVO20').trim().toUpperCase();
        const isEnabled = homeData.promoPopupEnabled !== false;

        if (cleanCode === configuredCode && isEnabled) {
          const discountNum = parseInt(String(homeData.promoPopupDiscount || '20').replace(/[^0-9]/g, ''), 10) || 20;
          return {
            id: cleanCode,
            active: true,
            products: [], // All products
            pricingMode: 'discount',
            discountPercent: discountNum,
            fixedPrices: {},
            maxRedemptions: 0,
            currentRedemptions: 0,
            note: 'Welcome Promo Discount',
          };
        }
      }

      // Default fallback if settings doc not yet customized
      if (cleanCode === 'CREVO20') {
        return {
          id: 'CREVO20',
          active: true,
          products: [],
          pricingMode: 'discount',
          discountPercent: 20,
          fixedPrices: {},
          maxRedemptions: 0,
          currentRedemptions: 0,
          note: 'Default Welcome Promo',
        };
      }
    } catch (err) {
      console.warn('Error checking homepage promo fallback:', err);
    }
    return null;
  };

  // Helper: check if a code belongs to an approved promoter
  const checkPromoterAffiliate = async (cleanCode: string): Promise<CustomLinkData | null> => {
    try {
      const res = await fetch(`/api/promoter/affiliate-check?code=${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.promoter) {
          return {
            id: cleanCode,
            active: true,
            products: [],
            pricingMode: 'discount',
            discountPercent: data.discountPercent || 10,
            fixedPrices: {},
            maxRedemptions: 0,
            currentRedemptions: 0,
            note: `Creator Affiliate: ${data.promoter.name}`,
          };
        }
      }
    } catch (e) {
      console.warn("Error checking promoter affiliate:", e);
    }
    return null;
  };

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
          
          let isValid = true;
          if (!data.active) isValid = false;
          if (data.maxRedemptions > 0 && (data.currentRedemptions || 0) >= data.maxRedemptions) isValid = false;

          if (isValid) {
            setActiveCustomLink(data);
            if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
          } else {
            setActiveCustomLink(null);
            if (typeof window !== 'undefined') sessionStorage.removeItem('custom_link_ref');
          }
        } else {
          // 1. Check promoter affiliate fallback
          const promoterFallback = await checkPromoterAffiliate(cleanCode);
          if (promoterFallback) {
            setActiveCustomLink(promoterFallback);
            if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
          } else {
            // 2. Check homepage promo fallback
            const promoFallback = await checkHomepagePromo(cleanCode);
            if (promoFallback) {
              setActiveCustomLink(promoFallback);
              if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
            } else {
              setActiveCustomLink(null);
              if (typeof window !== 'undefined') sessionStorage.removeItem('custom_link_ref');
            }
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

    if (activeCustomLink.products && activeCustomLink.products.length > 0 && !activeCustomLink.products.includes(productId)) {
      return currentPrice;
    }

    if (activeCustomLink.pricingMode === 'discount') {
      const discounted = currentPrice * (1 - (activeCustomLink.discountPercent / 100));
      return Math.round(discounted * 100) / 100;
    } else if (activeCustomLink.pricingMode === 'fixed') {
      const fixed = activeCustomLink.fixedPrices?.[productId];
      if (fixed) {
        return currency === 'INR' ? fixed.inr : fixed.usd;
      }
    }
    return currentPrice;
  };

  const applyCouponCode = async (code: string) => {
    try {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) return { success: false, error: "Please enter a coupon code." };

      // 1. Check custom_links collection first
      const docRef = doc(db, 'custom_links', cleanCode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as CustomLinkData;
        
        if (!data.active) {
          return { success: false, error: "This coupon is inactive." };
        }
        
        if (data.maxRedemptions > 0 && (data.currentRedemptions || 0) >= data.maxRedemptions) {
          return { success: false, error: "This coupon has reached its maximum usage limit." };
        }
        
        setActiveCustomLink(data);
        if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
        return { success: true };
      }

      // 2. Check promoter affiliate
      const promoterData = await checkPromoterAffiliate(cleanCode);
      if (promoterData) {
        setActiveCustomLink(promoterData);
        if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
        return { success: true };
      }

      // 3. Check homepage settings promo popup / CREVO20
      const promoData = await checkHomepagePromo(cleanCode);
      if (promoData) {
        setActiveCustomLink(promoData);
        if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
        return { success: true };
      }

      // 4. Check promocodes collection fallback
      const promoSnap = await getDoc(doc(db, 'promocodes', cleanCode));
      if (promoSnap.exists()) {
        const pData = promoSnap.data();
        if (pData.active !== false) {
          const promoObj: CustomLinkData = {
            id: cleanCode,
            active: true,
            products: pData.products || [],
            pricingMode: 'discount',
            discountPercent: pData.discountPercent || pData.discount || 20,
            fixedPrices: {},
            maxRedemptions: pData.maxRedemptions || 0,
            currentRedemptions: pData.currentRedemptions || 0,
          };
          setActiveCustomLink(promoObj);
          if (typeof window !== 'undefined') sessionStorage.setItem('custom_link_ref', cleanCode);
          return { success: true };
        }
      }

      return { success: false, error: "Invalid coupon code." };
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
