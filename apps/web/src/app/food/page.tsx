import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Utensils, Coffee, Wine } from 'lucide-react';

async function getFoodItems() {
  try {
    const res = await fetch('http://localhost:3001/food?activeOnly=true', { next: { revalidate: 60 } });
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
    <div className="min-h-screen bg-[#FAF9F6] pt-24">
      {/* Hero Section */}
      <section className="px-6 md:px-20 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-6">Culinary Experience</h1>
        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Savor authentic Maharashtrian cuisine prepared with fresh, locally sourced ingredients. From traditional thalis to continental delicacies, our master chefs craft every meal to perfection.
        </p>
      </section>

      {/* Dynamic Menu */}
      <section className="px-6 md:px-20 mb-32 max-w-6xl mx-auto">
        {mealOrder.map(meal => {
          const mealItems = grouped[meal];
          if (!mealItems || mealItems.length === 0) return null;

          return (
            <div key={meal} className="mb-16">
              <h2 className="text-3xl font-serif text-[#1E3F20] mb-8 border-b border-[#2A522C]/20 pb-4 flex items-center gap-3">
                {meal === 'Breakfast' ? <Coffee size={28} className="text-[#8B5E3C]" /> : 
                 meal === 'Evening Snacks' ? <Wine size={28} className="text-purple-700" /> : 
                 <Utensils size={28} className="text-[#D4AF37]" />}
                {meal}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mealItems.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    {item.image ? (
                      <div className="h-48 relative bg-gray-100">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-32 bg-[#FDFBF7] flex items-center justify-center border-b border-gray-100">
                        <Utensils className="text-gray-300" size={32} />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${item.isVeg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-gray-600 text-sm mt-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Call to action */}
      <section className="bg-[#1E3F20] py-20 px-6 md:px-20 text-center text-white">
        <h2 className="text-3xl md:text-5xl font-serif mb-6">Ready for a feast?</h2>
        <p className="text-gray-300 mb-10 max-w-xl mx-auto">
          All our day visit and stay packages include complimentary meals. Experience the taste of River Mist.
        </p>
        <Link 
          href="/booking"
          className="inline-flex items-center gap-2 bg-[#D4AF37] text-white px-8 py-4 rounded-full font-medium hover:bg-yellow-600 transition-colors"
        >
          Book Now
          <ArrowRight size={20} />
        </Link>
      </section>
    </div>
  );
}
