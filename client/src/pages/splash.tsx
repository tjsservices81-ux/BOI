import { useEffect, useState } from "react";
import { useLocation } from "wouter";

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
        background: '#0037ff',
        userSelect: 'none'
      }}
    >
      {/* Centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <img 
          src="/boi_logo.svg" 
          alt="Bank of Ireland" 
          className="h-16 w-auto filter brightness-0 invert mb-14"
          draggable={false}
        />
        
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent opacity-80" />
      </div>

      {/* Clean white curved bottom without status bar elements */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg 
          width="100%" 
          height="350" 
          viewBox="0 0 414 350" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,80 
               C80,30 120,50 160,60
               C180,65 200,70 207,90
               C214,70 234,65 254,60
               C294,50 334,30 414,80
               L414,200
               C414,250 350,300 207,320
               C64,300 0,250 0,200
               Z" 
            fill="white"
          />
        </svg>
      </div>
    </div>
  );
}