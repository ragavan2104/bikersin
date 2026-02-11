import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MarkAsSoldModal from './MarkAsSoldModal';
import BikeDetailsModal from './BikeDetailsModal';

const API_URL = 'http://localhost:5000/api';

export default function TenantDashboard() {
  const [, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('tenant_token'));
  
  // Login State
  const [companies, setCompanies] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // Dashboard State
  const [view, setView] = useState<'INVENTORY' | 'REPORTS'>('INVENTORY');
  const [bikes, setBikes] = useState<any[]>([]);
  const [salesReport, setSalesReport] = useState<any>(null);
  
  // Forms
  const [newBike, setNewBike] = useState({ name: '', regNo: '', aadhaarNumber: '', boughtPrice: '' });
  const [sellingBike, setSellingBike] = useState<any>(null);
  const [selectedBikeForDetails, setSelectedBikeForDetails] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
     if(token) {
         fetchBikes();
         fetchReport();
     }
  }, [token]);

  const fetchCompanies = async () => {
      const res = await fetch(`${API_URL}/public/companies`);
      if(res.ok) setCompanies(await res.json());
  };

  const login = async () => {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, companyId: selectedCompanyId })
        });
        const data = await res.json();
        if (data.token) {
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('tenant_token', data.token);
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (e) { alert('Login error'); }
  };

  const logout = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('tenant_token');
  };

  const fetchBikes = async () => {
    try {
        const res = await fetch(`${API_URL}/bikes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if(res.ok) setBikes(await res.json());
    } catch(e) { console.error(e); }
  };

  const addBike = async () => {
      if(!newBike.name || !newBike.regNo || !newBike.aadhaarNumber || !newBike.boughtPrice) return alert("Fill all fields");
      
      // Validate Aadhaar number
      const aadhaarRegex = /^\d{12}$/;
      if (!aadhaarRegex.test(newBike.aadhaarNumber)) {
        return alert('Aadhaar number must be exactly 12 digits');
      }
      try {
        const res = await fetch(`${API_URL}/bikes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(newBike)
        });
        if(res.ok) {
            setNewBike({ name: '', regNo: '', aadhaarNumber: '', boughtPrice: '' });
            fetchBikes();
        } else {
            const d = await res.json();
            alert(d.error);
        }
      } catch(e) { console.error(e); }
  };

  const fetchReport = async () => {
      try {
        const res = await fetch(`${API_URL}/reports/sales`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if(res.ok) setSalesReport(await res.json());
      } catch(e) { console.error(e); }
  };

  const generateInvoice = (bike: any) => {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Sales Invoice", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Invoice ID: ${bike.id.substring(0,8).toUpperCase()}`, 20, 40);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
      
      autoTable(doc, {
          startY: 60,
          head: [['Item', 'Reg No', 'Price']],
          body: [
              [bike.name, bike.regNo, `₹${bike.soldPrice}`]
          ],
      });
      
      doc.text(`Total Paid: ₹${bike.soldPrice}`, 140, 90);
      doc.save(`Invoice_${bike.regNo}.pdf`);
  };

  if (!token) {
      return (
          <div className="flex justify-center items-center h-screen bg-gray-50">
              <div className="bg-white p-8 rounded shadow-lg w-96">
                  <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Tenant Portal</h2>
                  
                  <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Select Dealership</label>
                      <select 
                        className="w-full border p-2 rounded"
                        value={selectedCompanyId}
                        onChange={e => setSelectedCompanyId(e.target.value)}
                      >
                          <option value="">-- Select Company --</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>

                  <input className="w-full border p-2 mb-3 rounded" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                  <input className="w-full border p-2 mb-6 rounded" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                  
                  <button 
                    disabled={!selectedCompanyId}
                    className={`w-full p-2 rounded text-white ${selectedCompanyId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    onClick={login}
                   >
                       Login
                   </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 lg:mb-8 space-y-4 lg:space-y-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Dealership Dashboard</h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
               <div className="flex gap-2">
                 <button 
                   className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-medium ${
                     view === 'INVENTORY' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
                   }`} 
                   onClick={() => setView('INVENTORY')}
                 >
                   Inventory
                 </button>
                 <button 
                   className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-medium ${
                     view === 'REPORTS' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
                   }`} 
                   onClick={() => setView('REPORTS')}
                 >
                   Reports
                 </button>
               </div>
               <button 
                 className="text-red-500 font-medium px-4 py-2 border border-red-300 rounded hover:bg-red-50 w-full sm:w-auto" 
                 onClick={logout}
               >
                 Logout
               </button>
            </div>
        </div>

        {view === 'INVENTORY' && (
            <>
                <div className="bg-white p-4 sm:p-6 rounded shadow mb-6 sm:mb-8">
                    <h3 className="font-bold text-lg mb-4">Add New Bike</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <input className="border p-2 rounded w-full" placeholder="Bike Name" value={newBike.name} onChange={e => setNewBike({...newBike, name: e.target.value})} />
                        <input className="border p-2 rounded w-full" placeholder="Reg No" value={newBike.regNo} onChange={e => setNewBike({...newBike, regNo: e.target.value})} />
                        <input 
                          className="border p-2 rounded w-full" 
                          placeholder="Aadhaar Number" 
                          maxLength={12} 
                          value={newBike.aadhaarNumber} 
                          onChange={e => setNewBike({...newBike, aadhaarNumber: e.target.value.replace(/\D/g, '')})} 
                        />
                        <input className="border p-2 rounded w-full" type="number" placeholder="Bought Price (₹)" value={newBike.boughtPrice} onChange={e => setNewBike({...newBike, boughtPrice: e.target.value})} />
                        <button className="bg-green-600 text-white rounded hover:bg-green-700 p-2 w-full font-medium" onClick={addBike}>Add Bike</button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded shadow overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Reg No</th>
                                <th className="p-4">Bought Price (₹)</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bikes.map(bike => (
                                <tr 
                                  key={bike.id} 
                                  className="border-b hover:bg-gray-50 cursor-pointer"
                                  onClick={() => setSelectedBikeForDetails({ id: bike.id, name: bike.name })}
                                >
                                    <td className="p-4">{bike.name}</td>
                                    <td className="p-4">
                                      <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm" 
                                           style={{ minWidth: '120px', height: '32px' }}>
                                        
                                        {/* Blue "IND" Strip */}
                                        <div className="bg-[#003399] w-3 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" title="Hologram"></div>
                                          <span className="text-[6px] font-bold text-white leading-none">IND</span>
                                        </div>

                                        {/* Plate Number */}
                                        <div className="flex-grow px-2 py-1 text-center">
                                          <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-sm uppercase" 
                                                style={{ fontFamily: '"Roboto Condensed", "Arial Narrow", sans-serif' }}>
                                            {bike.regNo}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">₹{bike.boughtPrice}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${bike.isSold ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {bike.isSold ? 'SOLD' : 'IN STOCK'}
                                        </span>
                                    </td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        {!bike.isSold ? (
                                            <button className="text-blue-600 hover:underline text-sm" onClick={() => setSellingBike(bike)}>Mark as Sold</button>
                                        ) : (
                                            <button className="text-gray-500 hover:text-gray-700 text-sm" onClick={() => generateInvoice(bike)}>Download Invoice</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                    {bikes.map(bike => (
                        <div 
                          key={bike.id} 
                          className="bg-white rounded-lg shadow p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedBikeForDetails({ id: bike.id, name: bike.name })}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">{bike.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${bike.isSold ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {bike.isSold ? 'SOLD' : 'IN STOCK'}
                                </span>
                            </div>

                            {/* Registration Number */}
                            <div className="flex justify-center">
                                <div className="inline-flex items-center overflow-hidden bg-white border-[1.5px] border-gray-400 rounded-sm shadow-sm" 
                                     style={{ minWidth: '120px', height: '32px' }}>
                                  
                                  {/* Blue "IND" Strip */}
                                  <div className="bg-[#003399] w-3 h-full flex flex-col items-center justify-center gap-0.5 px-0.5">
                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" title="Hologram"></div>
                                    <span className="text-[6px] font-bold text-white leading-none">IND</span>
                                  </div>

                                  {/* Plate Number */}
                                  <div className="flex-grow px-2 py-1 text-center">
                                    <span className="font-sans font-extrabold text-gray-900 tracking-[0.15em] text-sm uppercase" 
                                          style={{ fontFamily: '"Roboto Condensed", "Arial Narrow", sans-serif' }}>
                                      {bike.regNo}
                                    </span>
                                  </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="text-center">
                                <span className="text-gray-500 text-sm">Bought Price:</span>
                                <div className="text-lg font-medium text-gray-900">₹{bike.boughtPrice.toLocaleString()}</div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                                {!bike.isSold ? (
                                    <button 
                                        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700" 
                                        onClick={() => setSellingBike(bike)}
                                    >
                                        Mark as Sold
                                    </button>
                                ) : (
                                    <button 
                                        className="w-full bg-gray-100 text-gray-700 py-2 rounded font-medium hover:bg-gray-200" 
                                        onClick={() => generateInvoice(bike)}
                                    >
                                        Download Invoice
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}

        {view === 'REPORTS' && salesReport && (
            <div className="bg-white p-4 sm:p-8 rounded shadow">
                <h2 className="text-xl sm:text-2xl font-bold mb-6">Sales Performance</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                     <div className="bg-blue-50 p-4 sm:p-6 rounded text-center">
                         <h3 className="text-gray-500 mb-2 text-sm sm:text-base">Total Profit</h3>
                         <p className="text-2xl sm:text-4xl font-bold text-blue-700">₹{salesReport.totalProfit}</p>
                     </div>
                     <div className="bg-green-50 p-4 sm:p-6 rounded text-center">
                         <h3 className="text-gray-500 mb-2 text-sm sm:text-base">Bikes Sold</h3>
                         <p className="text-2xl sm:text-4xl font-bold text-green-700">{salesReport.salesCount}</p>
                     </div>
                </div>
                
                <h3 className="font-bold mb-4 text-lg">Sales History</h3>
                
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-sm font-medium">Bike</th>
                                <th className="p-3 text-sm font-medium">Bought</th>
                                <th className="p-3 text-sm font-medium">Sold</th>
                                <th className="p-3 text-sm font-medium">Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesReport.sales.map((s: any) => (
                                <tr 
                                  key={s.id} 
                                  className="border-t hover:bg-gray-50 cursor-pointer"
                                  onClick={() => setSelectedBikeForDetails({ id: s.id, name: s.name })}
                                >
                                    <td className="p-3 text-sm">{s.name}</td>
                                    <td className="p-3 text-sm">₹{s.boughtPrice}</td>
                                    <td className="p-3 text-sm">₹{s.soldPrice}</td>
                                    <td className="p-3 font-bold text-green-600 text-sm">+₹{s.soldPrice - s.boughtPrice}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-4">
                    {salesReport.sales.map((s: any) => (
                        <div 
                          key={s.id} 
                          className="bg-gray-50 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSelectedBikeForDetails({ id: s.id, name: s.name })}
                        >
                            <div className="font-medium text-gray-900">{s.name}</div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Bought:</span>
                                    <div className="font-medium">₹{s.boughtPrice}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">Sold:</span>
                                    <div className="font-medium">₹{s.soldPrice}</div>
                                </div>
                            </div>
                            <div className="text-center pt-2 border-t">
                                <span className="text-gray-500 text-sm">Profit:</span>
                                <div className="font-bold text-green-600 text-lg">+₹{s.soldPrice - s.boughtPrice}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {sellingBike && (
            <MarkAsSoldModal 
                bike={sellingBike} 
                onClose={() => setSellingBike(null)}
                onSubmit={async (soldPrice: number, customerData: any) => {
                    try {
                        const res = await fetch(`${API_URL}/bikes/${sellingBike.id}/mark-sold`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ soldPrice, customerData })
                        });
                        
                        if (res.ok) {
                            setSellingBike(null);
                            fetchBikes();
                            fetchReport();
                        } else {
                            const error = await res.json();
                            throw new Error(error.error || 'Failed to mark bike as sold');
                        }
                    } catch (error) {
                        console.error('Mark as sold error:', error);
                        throw error;
                    }
                }}
            />
        )}

        {selectedBikeForDetails && (
            <BikeDetailsModal 
              bikeId={selectedBikeForDetails.id} 
              onClose={() => setSelectedBikeForDetails(null)} 
            />
        )}
    </div>
  );
}
