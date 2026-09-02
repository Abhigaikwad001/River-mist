import { Trees, Sun, Coffee, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function RiversidePage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="relative h-[60vh] bg-green-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <Image 
            src="https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&q=80&w=2000" 
            alt="Riverside" 
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <Trees className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-md">Riverside Tranquility</h1>
          <p className="text-xl text-green-100 max-w-2xl mx-auto drop-shadow-sm">Unwind by the soothing flow of the river under a canopy of ancient trees.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-primary hover:text-accent font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Nature's Therapy</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our expansive riverside lawns provide the perfect setting to escape the noise of the city. Read a book, practice yoga at sunrise, or simply watch the water flow by.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><Sun className="w-5 h-5 text-green-600" /> Breathtaking sunset viewpoints</li>
              <li className="flex items-center gap-3"><Trees className="w-5 h-5 text-green-600" /> Shaded hammocks and gazebos</li>
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl h-80">
            <div className="relative w-full h-full">
              <Image src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=800" alt="River view" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-3xl p-10 border border-green-100 text-center">
          <Coffee className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Riverside High Tea</h2>
          <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Included in all our packages, enjoy a premium high-tea experience served directly at the riverside pavilions. Sip on freshly brewed local tea or coffee while savoring hot snacks as the sun goes down.
          </p>
        </div>
        
      </div>
    </div>
  );
}
