'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Text, Float, Environment, ContactShadows, PresentationControls, Html } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

// Zone Component for the architectural layout
function PropertyZone({ position, size, color, name, description }: any) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle breathing effect when hovered
      const scale = hovered ? 1.05 + Math.sin(state.clock.elapsedTime * 2) * 0.02 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHovered(true)} 
        onPointerOut={() => setHovered(false)}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.7} 
          metalness={0.1}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>
      
      {/* Label that appears on hover */}
      {hovered && (
        <Html position={[0, size[1] / 2 + 0.5, 0]} center className="pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-[#D4AF37] w-48 text-center transform transition-all duration-300">
            <h3 className="font-serif font-bold text-[#1E3F20]">{name}</h3>
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      
      <PresentationControls
        global
        rotation={[0.3, 0.5, 0]}
        polar={[-0.4, 0.2]}
        azimuth={[-1, 0.75]}
      >
        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.1}>
          <group position={[0, -1, 0]}>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#2A522C" opacity={0.4} transparent />
            </mesh>

            {/* Architectural Zones based on River Mist layout */}
            <PropertyZone position={[0, 0, 8]} size={[2, 0.5, 1]} color="#8B5E3C" name="Main Gate" description="Grand entrance to River Mist" />
            <PropertyZone position={[0, 0.5, 5]} size={[3, 1, 2]} color="#FAF9F6" name="Reception" description="Welcome desk & guest check-in" />
            
            <PropertyZone position={[-5, 0, 3]} size={[3, 0.5, 4]} color="#4A90E2" name="Aqua Zone" description="Swimming pool with rain dance" />
            <PropertyZone position={[-5, 0, 7]} size={[2, 0.5, 2]} color="#FF9F43" name="Kids Zone" description="Safe play area for children" />
            
            <PropertyZone position={[4, 0.5, -2]} size={[4, 2, 5]} color="#D4AF37" name="Wedding Hall" description="AC Banquet hall for indoor events" />
            <PropertyZone position={[-3, 0, -3]} size={[6, 0.2, 5]} color="#2A522C" name="Wedding Lawn" description="Grand open space for 1000+ guests" />
            
            <PropertyZone position={[4, 0, 4]} size={[3, 1, 4]} color="#8B5E3C" name="Dining" description="Authentic Maharashtrian cuisine" />
            <PropertyZone position={[7, 0, 4]} size={[2, 1, 4]} color="#636E72" name="Kitchen" description="Mega kitchen for 2000+ pax" />
            
            <PropertyZone position={[0, -0.2, -7]} size={[3, 0.4, 3]} color="#1E3F20" name="Amphitheatre" description="Haldi ceremonies & bonfire nights" />
            
            <PropertyZone position={[-7, 0.5, -5]} size={[2, 1, 2]} color="#FD79A8" name="Bride's Room" description="Luxury AC suite for bridal prep" />
            <PropertyZone position={[-7, 0.5, -1]} size={[2, 1, 2]} color="#0984E3" name="Groom's Room" description="Luxury AC suite for groom" />
            <PropertyZone position={[3, 1, -7]} size={[3, 1, 2]} color="#6C5CE7" name="VIP Lounge" description="Private enclave for special guests" />
            
            <PropertyZone position={[0, -0.8, -9]} size={[18, 0.1, 2]} color="#74B9FF" name="Riverside" description="Scenic riverbank walkway" />
          </group>
        </Float>
      </PresentationControls>

      <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      <Environment preset="forest" />
      
      {/* Background Ambience */}
      <Sparkles count={50} scale={12} size={4} speed={0.2} opacity={0.2} color="#D4AF37" />
    </>
  );
}

export function Experience3D() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // SSR safe fallback structure
  if (!mounted) {
    return <div className="absolute inset-0 -z-10 pointer-events-none mix-blend-multiply opacity-80" />;
  }

  return (
    <div className="absolute inset-0 -z-10 pointer-events-auto mix-blend-multiply opacity-80 cursor-grab active:cursor-grabbing">
      {isMobile ? (
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-[#1E3F20]/10 to-[#8B5E3C]/10 flex items-center justify-center">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }}></div>
        </div>
      ) : (
        <>
          <Canvas shadows camera={{ position: [0, 5, 10], fov: 45 }}>
            <fog attach="fog" args={['#FAF9F6', 5, 20]} />
            <Scene />
          </Canvas>
          <div className="absolute bottom-8 right-8 text-xs font-serif text-gray-500 tracking-widest uppercase pointer-events-none bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-200">
            Drag to explore property
          </div>
        </>
      )}
    </div>
  );
}
