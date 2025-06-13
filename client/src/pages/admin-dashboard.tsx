import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface IPAddress {
  ip: string;
  status: 'approved' | 'blocked';
  addedAt: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([]);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const adminKey = sessionStorage.getItem('adminKey');

  useEffect(() => {
    if (!adminKey) {
      setLocation('/admin/login');
      return;
    }
    loadIpAddresses();
  }, [adminKey]);

  const makeAdminRequest = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'X-Admin-Key': adminKey!,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  };

  const loadIpAddresses = async () => {
    try {
      const response = await makeAdminRequest('/admin/panel');
      if (response.ok) {
        const data = await response.json();
        setIpAddresses(data.ipAddresses || []);
      }
    } catch (error) {
      setMessage('Failed to load IP addresses');
    }
  };

  const addIpAddress = async () => {
    if (!newIp.trim()) {
      setMessage('Please enter a valid IP address');
      return;
    }

    setLoading(true);
    try {
      const response = await makeAdminRequest('/admin/add-ip', {
        method: 'POST',
        body: JSON.stringify({ ip: newIp.trim() })
      });

      if (response.ok) {
        setMessage('IP address added successfully');
        setNewIp('');
        loadIpAddresses();
      } else {
        const error = await response.text();
        setMessage(`Failed to add IP: ${error}`);
      }
    } catch (error) {
      setMessage('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const removeIpAddress = async (ip: string) => {
    setLoading(true);
    try {
      const response = await makeAdminRequest('/admin/remove-ip', {
        method: 'POST',
        body: JSON.stringify({ ip })
      });

      if (response.ok) {
        setMessage('IP address removed successfully');
        loadIpAddresses();
      } else {
        setMessage('Failed to remove IP address');
      }
    } catch (error) {
      setMessage('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('adminKey');
    setLocation('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">IP Whitelist Management</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add IP Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New IP Address</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="Enter IP address (e.g., 192.168.1.1)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#126987] focus:border-transparent outline-none"
              onKeyPress={(e) => e.key === 'Enter' && addIpAddress()}
            />
            <button
              onClick={addIpAddress}
              disabled={loading}
              className="bg-[#126987] text-white px-6 py-2 rounded-lg hover:bg-[#0d4f63] transition-colors disabled:opacity-50"
            >
              Add IP
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
            {message}
          </div>
        )}

        {/* IP Addresses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Whitelisted IP Addresses</h2>
          </div>
          
          {ipAddresses.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No IP addresses configured
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ipAddresses.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.addedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => removeIpAddress(item.ip)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setLocation('/')}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors text-center"
            >
              View Banking App
            </button>
            <button
              onClick={loadIpAddresses}
              className="bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 transition-colors text-center"
            >
              Refresh IP List
            </button>
            <button
              onClick={() => setMessage('')}
              className="bg-yellow-100 text-yellow-700 px-4 py-3 rounded-lg hover:bg-yellow-200 transition-colors text-center"
            >
              Clear Messages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}