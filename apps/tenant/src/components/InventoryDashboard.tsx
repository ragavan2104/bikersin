import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';
import MarkAsSoldModal from './MarkAsSoldModal';
import { apiService } from '../services/api';

const API_URL = 'http://localhost:5000/api';

interface Bike {
  id: string;
  name: string;
  regNo: string;
  aadhaarNumber: string;
  boughtPrice: number;
  soldPrice?: number;
  isSold: boolean;
  createdAt: string;
}

export default function InventoryDashboard() {
  const { token, role } = useAuth();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);

  const [newBike, setNewBike] = useState({
    name: '',
    regNo: '',
    aadhaarNumber: '',
    boughtPrice: ''
  });

  useEffect(() => {
    fetchBikes();
  }, []);

  const fetchBikes = async () => {
    try {
      const res = await fetch(`${API_URL}/tenant/bikes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setBikes(data);
      }
    } catch (error) {
      console.error('Failed to fetch bikes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBike = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Aadhaar number
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(newBike.aadhaarNumber)) {
      alert('Aadhaar number must be exactly 12 digits');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/tenant/bikes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBike)
      });

      if (res.ok) {
        setNewBike({ name: '', regNo: '', aadhaarNumber: '', boughtPrice: '' });
        setShowAddForm(false);
        fetchBikes();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add bike');
      }
    } catch (error) {
      alert('Error adding bike');
    }
  };

  const handleMarkAsSold = (bike: Bike) => {
    setSelectedBike(bike);
    setShowSoldModal(true);
  };

  const onSaleComplete = () => {
    setShowSoldModal(false);
    setSelectedBike(null);
    fetchBikes();
  };

  const handleSoldSubmit = async (soldPrice: number, customerData: any) => {
    if (!selectedBike) return;
    
    try {
      await apiService.markBikeAsSold(selectedBike.id, soldPrice, customerData);
      onSaleComplete();
    } catch (error) {
      console.error('Failed to mark bike as sold:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Bike Inventory</h2>
        {(role === 'ADMIN' || role === 'SUPERADMIN') && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Add New Bike
          </button>
        )}
      </div>

      {/* Add Bike Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Add New Bike</h3>
            <form onSubmit={addBike}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Bike Name</label>
                <input
                  type="text"
                  value={newBike.name}
                  onChange={(e) => setNewBike({ ...newBike, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                <input
                  type="text"
                  value={newBike.regNo}
                  onChange={(e) => setNewBike({ ...newBike, regNo: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                <input
                  type="text"
                  maxLength={12}
                  value={newBike.aadhaarNumber}
                  onChange={(e) => setNewBike({ ...newBike, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 12-digit Aadhaar number"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Bought Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBike.boughtPrice}
                  onChange={(e) => setNewBike({ ...newBike, boughtPrice: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Bike
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark as Sold Modal */}
      {showSoldModal && selectedBike && (
        <MarkAsSoldModal
          bike={selectedBike}
          onClose={() => setShowSoldModal(false)}
          onSubmit={handleSoldSubmit}
        />
      )}

      {/* Bikes Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {bikes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No bikes in inventory</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bike Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reg Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bought Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bikes.map((bike) => (
                <tr key={bike.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{bike.name}</div>
                      <div className="text-sm text-gray-500">Added: {new Date(bike.createdAt).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bike.regNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{bike.boughtPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {bike.isSold ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Sold
                        </span>
                        <div className="text-sm text-gray-500">
                          Sale Price: ₹{bike.soldPrice?.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!bike.isSold && (
                      <button
                        onClick={() => handleMarkAsSold(bike)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Mark as Sold
                      </button>
                    )}
                    {bike.isSold && (
                      <a
                        href={`${API_URL}/tenant/sales/receipt/${bike.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 ml-4"
                      >
                        Download Receipt
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}