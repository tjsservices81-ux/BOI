import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl mb-6">Page Not Found</h2>
        <p className="text-lg mb-8 opacity-90">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/dashboard">
          <Button className="bg-white text-blue-600 hover:bg-gray-100">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}