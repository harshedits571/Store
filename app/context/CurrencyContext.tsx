'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CurrencyType = 'USD' | 'INR';

type PriceableItem = {
  price?: number;
  salePrice?: number | null;
  inrPrice?: number;
  inrSalePrice?: number | null;
};

type CurrencyContextType = {
  currency: CurrencyType;
  symbol: string;
  getPrice: (item: PriceableItem) => number;
  getOriginalPrice: (item: PriceableItem) => number;
  formatPrice: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const INR_MULTIPLIER = 84; // Fallback conversion rate

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyType>('USD'); 
  const [symbol, setSymbol] = useState<string>('$');

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        if (data && data.country_code === 'IN') {
          setCurrency('INR');
          setSymbol('₹');
          return;
        } else if (data && data.country_code) {
          setCurrency('USD');
          setSymbol('$');
          return;
        }
      } catch (err) {
        console.warn("Primary IP lookup failed. Trying fallback...");
      }

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') {
          setCurrency('INR');
          setSymbol('₹');
        } else {
          setCurrency('USD');
          setSymbol('$');
        }
      } catch (err) {
        setCurrency('USD');
        setSymbol('$');
      }
    };

    detectCurrency();
  }, []);

  const getOriginalPrice = (item: PriceableItem): number => {
    const baseUsd = Number(item.price) || 0;
    
    if (currency === 'INR') {
      if (item.inrPrice !== undefined && item.inrPrice !== null && Number(item.inrPrice) > 0) {
        return Number(item.inrPrice);
      }
      return baseUsd * INR_MULTIPLIER;
    }
    
    return baseUsd;
  };

  const getPrice = (item: PriceableItem): number => {
    if (currency === 'INR') {
      if (item.inrSalePrice !== undefined && item.inrSalePrice !== null && Number(item.inrSalePrice) > 0) {
        return Number(item.inrSalePrice);
      }
      if (item.inrPrice !== undefined && item.inrPrice !== null && Number(item.inrPrice) > 0) {
        return Number(item.inrPrice);
      }
      // Fallbacks
      if (item.salePrice !== undefined && item.salePrice !== null && Number(item.salePrice) > 0) {
        return Number(item.salePrice) * INR_MULTIPLIER;
      }
      return (Number(item.price) || 0) * INR_MULTIPLIER;
    }
    
    // USD
    if (item.salePrice !== undefined && item.salePrice !== null && Number(item.salePrice) > 0) {
      return Number(item.salePrice);
    }
    return Number(item.price) || 0;
  };

  const formatPrice = (amount: number): string => {
    if (currency === 'INR') {
       return `₹${Math.round(amount).toLocaleString('en-IN')}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, getPrice, getOriginalPrice, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
