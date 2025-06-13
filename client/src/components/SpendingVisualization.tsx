import { useState, useEffect, useRef } from 'react';

interface Transaction {
  id: number;
  amount: string;
  description: string;
  timestamp: string;
  type: 'debit' | 'credit';
  category?: string;
}

interface SpendingPattern {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  velocity: { x: number; y: number };
  category: string;
  amount: number;
}

export default function SpendingVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [patterns, setPatterns] = useState<SpendingPattern[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const loadTransactions = () => {
      const storedTransactions = JSON.parse(localStorage.getItem('bankTransactions') || '[]');
      
      // Limit patterns to improve performance - only show recent transactions
      const recentTransactions = storedTransactions.slice(-20);
      
      // Convert transactions to visual patterns
      const newPatterns: SpendingPattern[] = recentTransactions.map((tx: Transaction) => {
        const amount = Math.abs(parseFloat(tx.amount));
        const category = getCategoryFromDescription(tx.description);
        
        return {
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height,
          size: Math.min(Math.max(amount / 10, 3), 20), // Smaller max size for performance
          opacity: Math.min(0.1 + (amount / 1000), 0.25), // Reduced max opacity
          color: getCategoryColor(category),
          velocity: {
            x: (Math.random() - 0.5) * 0.15, // Slower movement
            y: (Math.random() - 0.5) * 0.15
          },
          category,
          amount
        };
      });

      // Reduced ambient particles for better performance
      const ambientParticles: SpendingPattern[] = Array.from({ length: 8 }, () => ({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.03 + 0.01,
        color: '#126987',
        velocity: {
          x: (Math.random() - 0.5) * 0.08,
          y: (Math.random() - 0.5) * 0.08
        },
        category: 'ambient',
        amount: 0
      }));

      setPatterns([...newPatterns, ...ambientParticles]);
    };

    if (dimensions.width > 0 && dimensions.height > 0) {
      loadTransactions();
    }
  }, [dimensions]);

  const getCategoryFromDescription = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('transfer')) return 'transfer';
    if (desc.includes('atm') || desc.includes('withdrawal')) return 'cash';
    if (desc.includes('electric') || desc.includes('direct debit')) return 'bills';
    if (desc.includes('restaurant') || desc.includes('food')) return 'dining';
    if (desc.includes('online') || desc.includes('purchase')) return 'shopping';
    if (desc.includes('interest') || desc.includes('deposit')) return 'income';
    return 'general';
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      transfer: '#126987',
      cash: '#6b7280',
      bills: '#ef4444',
      dining: '#f59e0b',
      shopping: '#8b5cf6',
      income: '#10b981',
      general: '#64748b',
      ambient: '#126987'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || patterns.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    let lastTime = 0;
    const targetFPS = 30; // Reduced frame rate for better performance
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      if (currentTime - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setPatterns(currentPatterns => 
        currentPatterns.map(pattern => {
          // Update position
          const newX = pattern.x + pattern.velocity.x;
          const newY = pattern.y + pattern.velocity.y;

          // Bounce off edges
          let newVelX = pattern.velocity.x;
          let newVelY = pattern.velocity.y;

          if (newX <= 0 || newX >= canvas.width) {
            newVelX = -newVelX;
          }
          if (newY <= 0 || newY >= canvas.height) {
            newVelY = -newVelY;
          }

          // Draw the pattern
          ctx.save();
          ctx.globalAlpha = pattern.opacity;
          ctx.fillStyle = pattern.color;
          ctx.beginPath();
          ctx.arc(newX, newY, pattern.size, 0, Math.PI * 2);
          ctx.fill();

          // Simplified glow effect - only for very large transactions
          if (pattern.amount > 200) {
            ctx.globalAlpha = pattern.opacity * 0.2;
            ctx.beginPath();
            ctx.arc(newX, newY, pattern.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();

          return {
            ...pattern,
            x: newX,
            y: newY,
            velocity: { x: newVelX, y: newVelY }
          };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [patterns.length, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: 'transparent',
        mixBlendMode: 'multiply'
      }}
    />
  );
}