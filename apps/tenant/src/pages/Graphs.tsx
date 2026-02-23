import { useState, useEffect, useMemo } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area
} from 'recharts'
import { apiService } from '../services/api'

export default function Graphs() {
    const [analyticsData, setAnalyticsData] = useState<{ inventoryData: any[], salesData: any[] }>({ inventoryData: [], salesData: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Filters
    const [filterType, setFilterType] = useState<'ALL' | 'SOLD'>('SOLD')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const data = await apiService.getBikeAnalytics()
            setAnalyticsData(data)
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch analytics data')
        } finally {
            setLoading(false)
        }
    }

    const chartData = useMemo(() => {
        const sourceData = filterType === 'SOLD' ? analyticsData.salesData : analyticsData.inventoryData;

        let filtered = sourceData;
        if (startDate) {
            filtered = filtered.filter((item: any) => new Date(item.dateValue) >= new Date(startDate))
        }
        if (endDate) {
            filtered = filtered.filter((item: any) => {
                const itemDate = new Date(item.dateValue);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return itemDate <= end;
            });
        }
        return filtered;
    }, [analyticsData, filterType, startDate, endDate])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
            </div>
        )
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-md shadow-lg">
                    <p className="font-semibold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between gap-4 text-sm">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-medium text-gray-900">
                                {entry.name === 'Count' ? entry.value : `₹${entry.value.toLocaleString()}`}
                            </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Analytics & Graphs
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Visual insights into your inventory and sales performance
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'SOLD')}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        >
                            <option value="SOLD">Sold Bikes Only (Sales)</option>
                            <option value="ALL">All Bikes (Inventory Tracking)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        />
                    </div>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                    No data available for the selected filters.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Revenue & Profit Chart */}
                    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">
                            {filterType === 'SOLD' ? 'Revenue & Profit Over Time' : 'Purchases Over Time'}
                        </h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36} />
                                    {filterType === 'SOLD' && (
                                        <>
                                            <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                                            <Area type="monotone" dataKey="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                                        </>
                                    )}
                                    {filterType === 'ALL' && (
                                        <Area type="monotone" dataKey="Bought Price" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorBought)" />
                                    )}
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorBought" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Volume Chart */}
                    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Volume Tracking</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="Count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
