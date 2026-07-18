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
import { ThemeProvider } from "./components/ThemeProvider";
import { CustomLinkProvider } from "./context/CustomLinkContext";
import GlobalLoader from "./components/GlobalLoader";
import VisitorTracker from "./components/VisitorTracker";
import { Suspense } from "react";
import "./globals.css";

const outfit = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crevo Store | Premium Assets & Plugins",
  description: "High-quality plugins, scripts, and assets for professional creators.",
  metadataBase: new URL('https://www.crevostore.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.crevostore.com',
    siteName: 'Crevo Store',
    title: 'Crevo Store | Premium Assets & Plugins',
    description: 'High-quality plugins, scripts, and assets for professional creators.'
  },
  icons: {
    icon: '/fabicone.png',
    shortcut: '/fabicone.png',
    apple: '/fabicone.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.crevostore.com/#organization",
                  "name": "Crevo Store",
                  "url": "https://www.crevostore.com/",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.crevostore.com/logo.png"
                  },
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "email": "hello.creativestore@gmail.com",
                    "contactType": "customer service"
                  }
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.crevostore.com/#website",
                  "url": "https://www.crevostore.com/",
                  "name": "Crevo Store",
                  "publisher": {
                    "@id": "https://www.crevostore.com/#organization"
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <GlobalLoader />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SmoothScroll>
            <CurrencyProvider>
            <AuthProvider>
            <StoreProvider>
            <CartProvider>
            <Suspense fallback={null}>
              <CustomLinkProvider>
                <VisitorTracker />
                <Navbar />
                <CartDrawer />
              <main>
                {children}
              </main>
              <Footer />
              </CustomLinkProvider>
            </Suspense>
            </CartProvider>
            </StoreProvider>
            </AuthProvider>
            </CurrencyProvider>
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}
