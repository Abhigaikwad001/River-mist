import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Utensils, Coffee, Wine, Leaf } from 'lucide-react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getFoodItems() {
  try {
    const res = await fetch(`${apiUrl}/food?activeOnly=true`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch food items", error);
    return [];
  }
}

export default async function FoodPage() {
  const items = await getFoodItems();
  
  // Group by meal
  const grouped = items.reduce((acc: any, item: any) => {
    if (!acc[item.meal]) acc[item.meal] = [];
    acc[item.meal].push(item);
    return acc;
  }, {});

  const mealOrder = ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner Veg', 'Dinner Non-Veg'];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col pt-20">
      {/* 1. HERO / CULINARY EXPERIENCE */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-[#1E3F20]">
          <Image 
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=2000" 
            alt="Culinary Feast at River Mist" 
            fill 
            sizes="100vw"
            priority
            className="object-cover opacity-60" 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 drop-shadow-md">Culinary Experience</h1>
          <p className="text-gray-200 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Savor authentic Maharashtrian cuisine prepared with fresh, locally sourced ingredients. A journey of taste that perfectly complements your stay.
          </p>
        </div>
      </section>

      {/* 2 & 3. MAHARASHTRIAN CUISINE & TRADITIONAL THALI */}
      <section className="py-24 px-6 md:px-20 container mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-[#D4AF37] uppercase tracking-widest text-sm font-bold mb-3">Authentic Flavors</h2>
            <h3 className="text-4xl md:text-5xl font-serif text-[#1E3F20] mb-6 leading-tight">Maharashtrian Local Specialties</h3>
            <div className="w-16 h-[1px] bg-[#D4AF37] mb-8"></div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              At River Mist, food is an integral part of the agrotourism experience. Our signature traditional thalis are crafted following age-old family recipes that bring out the true essence of Maharashtrian hospitality. 
            </p>
            <p className="text-gray-600 leading-relaxed">
              From perfectly spiced gravies and bhakris hot off the chulha (traditional stove) to sweet delicacies that melt in your mouth, every meal is designed to leave you feeling nourished and delighted.
            </p>
          </div>
          <div className="lg:w-1/2 w-full relative">
            <div className="relative h-[400px] md:h-[500px] rounded-t-full rounded-b-xl overflow-hidden shadow-2xl border border-[#D4AF37]/20">
              <Image 
                src="https://images.unsplash.com/photo-1626776876729-bab43b745ce5?auto=format&fit=crop&q=80&w=1000" 
                alt="Traditional Maharashtrian Thali" 
                fill 
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover hover:scale-105 transition-transform duration-1000 ease-out" 
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-xl shadow-xl border border-[#D4AF37]/10 hidden md:block z-10">
              <Utensils className="text-[#D4AF37] mb-2" size={32} />
              <p className="font-serif text-[#1E3F20] text-xl">Traditional Thali</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FARM-TO-TABLE / LOCAL INGREDIENTS */}
      <section className="bg-[#1E3F20] text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-20">
           <Image 
            src="https://images.unsplash.com/photo-1595858603613-289569b4c022?auto=format&fit=crop&q=80&w=1000" 
            alt="Farm Fresh Ingredients" 
            fill 
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3F20] via-[#1E3F20]/80 to-transparent" />
        </div>
        
        <div className="container mx-auto px-6 md:px-20 relative z-10">
          <div className="max-w-xl">
            <Leaf className="text-[#D4AF37] mb-6" size={40} />
            <h2 className="text-3xl md:text-4xl font-serif mb-6">Farm-to-Table Philosophy</h2>
            <p className="text-gray-300 mb-8 leading-relaxed font-light text-lg">
              Nestled in the heart of nature, we believe that the best food comes straight from the earth. We source our vegetables, spices, and dairy locally, supporting nearby farmers and ensuring that every dish on your plate is fresh, organic, and bursting with natural flavor.
            </p>
          </div>
        </div>
      </section>

      {/* DYNAMIC MENU SECTION */}
      {items.length > 0 && (
        <section className="py-24 px-6 md:px-20 container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[#D4AF37] uppercase tracking-widest text-sm font-bold mb-3">Our Offerings</h2>
            <h3 className="text-4xl font-serif text-[#1E3F20]">The Menu</h3>
            <div className="w-16 h-[1px] bg-[#D4AF37] mx-auto mt-6"></div>
          </div>

          <div className="max-w-6xl mx-auto">
            {mealOrder.map(meal => {
              const mealItems = grouped[meal];
              if (!mealItems || mealItems.length === 0) return null;

              return (
                <div key={meal} className="mb-20">
                  <h4 className="text-3xl font-serif text-[#1E3F20] mb-8 border-b border-[#D4AF37]/30 pb-4 flex items-center gap-3">
                    {meal.includes('Breakfast') ? <Coffee size={28} className="text-[#D4AF37]" /> : 
                     meal.includes('Evening') ? <Wine size={28} className="text-[#D4AF37]" /> : 
                     <Utensils size={28} className="text-[#D4AF37]" />}
                    {meal}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {mealItems.map((item: any) => (
                      <div key={item.id} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        {item.image ? (
                          <div className="h-48 relative bg-gray-100 overflow-hidden">
                            <Image 
                              src={item.image} 
                              alt={item.name} 
                              fill 
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
                              className="object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                          </div>
                        ) : (
                          <div className="h-2 bg-[#D4AF37]/20 w-full"></div>
                        )}
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="text-lg font-bold text-gray-900 font-serif">{item.name}</h5>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full ${item.isVeg ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. DINING EXPERIENCE */}
      <section className="py-20 px-6 md:px-20 bg-white">
        <div className="container mx-auto">
          <div className="relative h-[400px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl">
            <Image 
              src="https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&q=80&w=1200" 
              alt="Dining Experience at River Mist" 
              fill 
              sizes="100vw"
              className="object-cover" 
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center p-8">
              <h2 className="text-3xl md:text-5xl font-serif text-white mb-6">Dine Amidst Nature</h2>
              <p className="text-white/90 max-w-2xl text-lg font-light">Whether under the open sky or in our elegantly rustic dining hall, every meal is accompanied by the serene sounds of nature and exceptional service.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="bg-[#FAF9F6] py-24 px-6 text-center border-t border-[#D4AF37]/20">
        <h2 className="text-4xl md:text-5xl font-serif text-[#1E3F20] mb-6">Ready for a Feast?</h2>
        <p className="text-gray-600 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
          All our day visit and stay packages include complimentary meals. Come experience the unforgettable taste of River Mist.
        </p>
        <Link 
          href="/booking"
          className="inline-flex items-center gap-2 bg-[#D4AF37] text-white px-10 py-4 rounded-full font-medium hover:bg-[#b5952f] transition-all hover:shadow-lg uppercase tracking-widest text-sm"
        >
          Book Your Visit
          <ArrowRight size={20} />
        </Link>
      </section>
    </div>
  );
}
