import { useState } from 'react';
import { useLocation } from 'wouter';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!adminKey.trim()) {
      setError('Please enter the admin key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/admin/panel', {
        method: 'GET',
        headers: {
          'X-Admin-Key': adminKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Store the admin key for future requests
        sessionStorage.setItem('adminKey', adminKey);
        setLocation('/admin/dashboard');
      } else {
        setError('Invalid admin key');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#126987] to-[#0d4f63] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#126987] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Access</h1>
          <p className="text-gray-600 mt-2">Enter your admin key to continue</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Key
            </label>
            <input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent outline-none transition-all"
              placeholder="Enter admin key..."
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#126987] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#0d4f63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Authenticating...
              </div>
            ) : (
              'Access Admin Panel'
            )}
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setLocation('/')}
            className="text-[#126987] hover:text-[#0d4f63] text-sm font-medium transition-colors"
          >
            ← Back to Banking App
          </button>
        </div>
      </div>
    </div>
  );
}