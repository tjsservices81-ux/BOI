import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import splashImage from "@assets/IMG_0633_1749764189094.png";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        navigate('/login');
      }, 300);
    }, 5500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className={`h-screen w-screen fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundImage: `url(${splashImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        userSelect: 'none'
      }}
    >
      {/* Loading spinner positioned at bottom center */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-gray-600 border-t-transparent opacity-80" />
      </div>
    </div>
  );
}