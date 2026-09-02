import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rivermist.com'),
  title: {
    default: "River Mist | Premium Agro-Tourism Resort",
    template: "%s | River Mist"
  },
  description: "Experience luxury in nature at River Mist. Book your day visits, weddings, and events.",
  keywords: ["Agro-Tourism", "Resort", "Weddings", "Day Visit", "Pune", "Luxury"],
  openGraph: {
    title: "River Mist | Premium Agro-Tourism Resort",
    description: "Experience luxury in nature at River Mist.",
    url: "https://rivermist.com",
    siteName: "River Mist",
    images: [
      {
        url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1200",
        width: 1200,
        height: 630,
        alt: "River Mist Luxury Resort"
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  alternates: {
    canonical: "/",
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "River Mist Resort",
  "image": "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=1200",
  "description": "Premium Agro-Tourism Resort",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "River Road, Agro Valley",
    "addressLocality": "Pune",
    "addressRegion": "Maharashtra",
    "addressCountry": "IN"
  },
  "telephone": "+91 9322759343",
  "priceRange": "$$"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased scroll-smooth`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-black">
          Skip to main content
        </a>
        <Header />

        <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>

        <footer className="bg-primary text-gray-300 py-16 mt-auto">
          <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-serif text-3xl font-bold text-white mb-4">River Mist</h3>
              <p className="text-sm opacity-80 leading-relaxed max-w-sm">A sanctuary of classic elegance where nature meets celebration. Discover the art of premium agro-tourism.</p>
            </div>
            <div>
              <h4 className="classic-subheading mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm opacity-80">
                <li><a href="/explore" className="hover:text-accent transition-colors">Explore Activities</a></li>
                <li><a href="/events" className="hover:text-accent transition-colors">Packages & Events</a></li>
                <li><a href="/weddings" className="hover:text-accent transition-colors">Luxury Weddings</a></li>
                <li><a href="/about" className="hover:text-accent transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-accent transition-colors">Contact Us</a></li>
                <li><a href="/policies" className="hover:text-accent transition-colors">Terms & Policies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="classic-subheading mb-6">Contact Us</h4>
              <p className="text-sm opacity-80 leading-relaxed">
                River Road, Agro Valley<br />
                Maharastra, India<br />
                <br />
                📞 +91 9322759343
              </p>
            </div>
          </div>
          <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-xs text-center opacity-50 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} River Mist Resort. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
