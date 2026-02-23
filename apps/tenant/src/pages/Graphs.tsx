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
    Area,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    ComposedChart
} from 'recharts'
import { apiService } from '../services/api'
import { 
    TrendingUp, 
    TrendingDown,
    IndianRupee,
    BarChart3,
    Download,
    Calendar,
    RefreshCw
} from 'lucide-react'

export default function Graphs() {
    const [analyticsData, setAnalyticsData] = useState<{ 
        inventoryData: any[], 
        salesData: any[], 
        trendData: any[], 
        topProfitBikes: any[], 
        summary: any 
    }>({ 
        inventoryData: [], 
        salesData: [], 
        trendData: [], 
        topProfitBikes: [], 
        summary: {} 
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Enhanced filters
    const [filterType, setFilterType] = useState<'ALL' | 'SOLD'>('SOLD')
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('day')
    const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | '1year' | 'custom'>('30days')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    // Chart colors
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316']

    useEffect(() => {
        fetchAnalytics()
    }, [groupBy])

    useEffect(() => {
        setCustomDateRange()
    }, [dateRange])

    const setCustomDateRange = () => {
        const now = new Date()
        const ranges = {
            '7days': { days: 7 },
            '30days': { days: 30 },
            '90days': { days: 90 },
            '1year': { days: 365 },
            'custom': null
        }

        if (dateRange !== 'custom' && ranges[dateRange]) {
            const start = new Date(now)
            start.setDate(now.getDate() - ranges[dateRange].days)
            setStartDate(start.toISOString().split('T')[0])
            setEndDate(now.toISOString().split('T')[0])
        }
    }

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const data = await apiService.getBikeAnalytics(groupBy)
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

    const pieChartData = useMemo(() => {
        if (!analyticsData.summary) return []
        const { totalBikes, soldBikes, availableBikes } = analyticsData.summary
        return [
            { name: 'Sold', value: soldBikes, color: '#10B981' },
            { name: 'Available', value: availableBikes, color: '#3B82F6' }
        ]
    }, [analyticsData.summary])

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)

    const exportData = () => {
        const dataToExport = {
            summary: analyticsData.summary,
            salesData: chartData,
            topProfitBikes: analyticsData.topProfitBikes,
            exportedAt: new Date().toISOString()
        }
        
        const dataStr = JSON.stringify(dataToExport, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        
        const exportFileDefaultName = `bike-analytics-${new Date().toISOString().split('T')[0]}.json`
        
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
                <button 
                    onClick={fetchAnalytics}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try Again
                </button>
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
                                {entry.name === 'Count' ? entry.value : 
                                 entry.name.includes('Margin') ? `${entry.value.toFixed(2)}%` :
                                 formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    const KPICard = ({ title, value, icon: Icon, trend, color = 'blue' }: any) => {
        const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 border-blue-200',
            green: 'bg-green-50 text-green-600 border-green-200',
            yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
            red: 'bg-red-50 text-red-600 border-red-200',
            purple: 'bg-purple-50 text-purple-600 border-purple-200'
        }

        return (
            <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    {trend && (
                        <div className={`flex items-center ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend > 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                                <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Business Analytics Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Comprehensive insights into your bike inventory and sales performance
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={exportData}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                    </button>
                    <button
                        onClick={fetchAnalytics}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {analyticsData.summary && Object.keys(analyticsData.summary).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                        title="Total Revenue"
                        value={formatCurrency(analyticsData.summary.totalRevenue || 0)}
                        icon={IndianRupee}
                        color="green"
                    />
                    <KPICard 
                        title="Total Profit"
                        value={formatCurrency(analyticsData.summary.totalProfit || 0)}
                        icon={TrendingUp}
                        color="blue"
                    />
                    <KPICard 
                        title="Profit Margin"
                        value={`${analyticsData.summary.profitMargin || 0}%`}
                        icon={BarChart3}
                        color="purple"
                    />
                    <KPICard 
                        title="Avg Profit/Bike"
                        value={formatCurrency(analyticsData.summary.avgProfitPerBike || 0)}
                        icon={TrendingUp}
                        color="yellow"
                    />
                </div>
            )}

            {/* Enhanced Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filter & Group Data</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'SOLD')}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        >
                            <option value="SOLD">Sales Data</option>
                            <option value="ALL">Inventory Data</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as any)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        >
                            <option value="day">Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                            <option value="year">Yearly</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="90days">Last 90 Days</option>
                            <option value="1year">Last Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value)
                                setDateRange('custom')
                            }}
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value)
                                setDateRange('custom')
                            }}
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        />
                    </div>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                    <p>No data available for the selected filters. Try adjusting your date range or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Charts Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Revenue & Profit Chart */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-6">
                                {filterType === 'SOLD' ? 'Revenue & Profit Analysis' : 'Purchase Analysis'}
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 12 }} 
                                            tickMargin={10} 
                                            axisLine={false} 
                                            tickLine={false}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis 
                                            yAxisId="left"
                                            tick={{ fontSize: 12 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickFormatter={(value) => formatCurrency(value)}
                                        />
                                        <YAxis 
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fontSize: 12 }} 
                                            axisLine={false} 
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        {filterType === 'SOLD' && (
                                            <>
                                                <Bar yAxisId="left" dataKey="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Revenue" />
                                                <Bar yAxisId="left" dataKey="Profit" fill="#10B981" radius={[4, 4, 0, 0]} name="Profit" />
                                                <Line yAxisId="right" type="monotone" dataKey="Profit Margin" stroke="#F59E0B" strokeWidth={3} name="Profit Margin %" />
                                            </>
                                        )}
                                        {filterType === 'ALL' && (
                                            <>
                                                <Bar yAxisId="left" dataKey="Bought Price" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Purchase Amount" />
                                                <Line yAxisId="right" type="monotone" dataKey="Count" stroke="#EF4444" strokeWidth={3} name="Quantity" />
                                            </>
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trend Analysis */}
                        {analyticsData.trendData && analyticsData.trendData.length > 0 && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-6">Monthly Trend Analysis</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analyticsData.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
                                            <Tooltip 
                                                formatter={(value: any, name: string) => [
                                                    name === 'count' ? value : formatCurrency(value), 
                                                    name === 'count' ? 'Sales Count' : name.charAt(0).toUpperCase() + name.slice(1)
                                                ]}
                                            />
                                            <Legend />
                                            <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue" />
                                            <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="Profit" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Summary & Charts */}
                    <div className="space-y-6">
                        {/* Inventory Distribution */}
                        {pieChartData.length > 0 && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-6">Inventory Distribution</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieChartData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => [value, 'Bikes']} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Bikes:</span>
                                        <span className="font-medium">{analyticsData.summary?.totalBikes || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Success Rate:</span>
                                        <span className="font-medium">
                                            {analyticsData.summary?.totalBikes > 0 
                                                ? Math.round((analyticsData.summary.soldBikes / analyticsData.summary.totalBikes) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Performing Bikes */}
                        {analyticsData.topProfitBikes && analyticsData.topProfitBikes.length > 0 && (
                            <div className="bg-white shadow rounded-lg p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-6">Top Performing Bikes</h3>
                                <div className="space-y-3">
                                    {analyticsData.topProfitBikes.slice(0, 5).map((bike: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{bike.name}</p>
                                                <p className="text-xs text-gray-500">{bike.regNo}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-sm text-green-600">
                                                    {formatCurrency(bike.profit)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {bike.profitMargin.toFixed(1)}% margin
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Stats */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-6">Quick Statistics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Average Sale Value:</span>
                                    <span className="text-sm font-medium">
                                        {analyticsData.summary?.soldBikes > 0 
                                            ? formatCurrency(analyticsData.summary.totalRevenue / analyticsData.summary.soldBikes)
                                            : formatCurrency(0)
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Investment:</span>
                                    <span className="text-sm font-medium">
                                        {formatCurrency(analyticsData.summary?.totalCost || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">ROI:</span>
                                    <span className={`text-sm font-medium ${
                                        (analyticsData.summary?.totalCost > 0 && analyticsData.summary?.totalProfit > 0) 
                                            ? 'text-green-600' 
                                            : 'text-red-600'
                                    }`}>
                                        {analyticsData.summary?.totalCost > 0
                                            ? `${((analyticsData.summary.totalProfit / analyticsData.summary.totalCost) * 100).toFixed(2)}%`
                                            : '0%'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
