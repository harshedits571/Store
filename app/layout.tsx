import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "./components/Navbar";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import SmoothScroll from "./components/SmoothScroll";
import "./globals.css";

const outfit = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creative Store | Premium Assets & Plugins",
  description: "High-quality plugins, scripts, and assets for creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SmoothScroll>
          <CurrencyProvider>
          <AuthProvider>
          <StoreProvider>
          <CartProvider>
            <Navbar />
            <CartDrawer />
          <main>
            {children}
          </main>
          <Footer />
          </CartProvider>
          </StoreProvider>
          </AuthProvider>
          </CurrencyProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
