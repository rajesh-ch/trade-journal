import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, BarChart3, List, LayoutDashboard, History, X, Upload, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { format, parseISO, startOfDay, subWeeks, subMonths, subYears, isAfter } from 'date-fns';
import { cn } from './lib/utils';
import { Trade } from './types';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const SECTORS = [
  "Technology Services",
  "Electronic Technology",
  "Finance",
  "Health Technology",
  "Health Services",
  "Consumer Services",
  "Consumer Durables",
  "Consumer Non-Durables",
  "Process Industries",
  "Distribution Services",
  "Retail Trade",
  "Commercial Services",
  "Transportation",
  "Utilities",
  "Energy Minerals",
  "Non-Energy Minerals",
  "Communications",
  "Producer Manufacturing",
  "Miscellaneous"
];

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'history'>('dashboard');
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  // Load trades from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tradelog_trades');
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse trades", e);
      }
    }
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem('tradelog_trades', JSON.stringify(trades));
  }, [trades]);

  const addTrade = (trade: Omit<Trade, 'id'>) => {
    const newTrade = { ...trade, id: crypto.randomUUID() };
    setTrades([newTrade, ...trades]);
    setIsAddingTrade(false);
  };

  const updateTrade = (id: string, updatedTrade: Omit<Trade, 'id'>) => {
    setTrades(trades.map(t => t.id === id ? { ...updatedTrade, id } : t));
    setEditingTrade(null);
  };

  const deleteTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
    setSelectedTradeIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  const toggleSelectTrade = (id: string) => {
    setSelectedTradeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTradeIds.length === trades.length) {
      setSelectedTradeIds([]);
    } else {
      setSelectedTradeIds(trades.map(t => t.id));
    }
  };

  const deleteSelectedTrades = () => {
    if (confirm(`Are you sure you want to delete ${selectedTradeIds.length} trades?`)) {
      setTrades(trades.filter(t => !selectedTradeIds.includes(t.id)));
      setSelectedTradeIds([]);
    }
  };

  const bulkUpdatePattern = () => {
    const newPattern = prompt("Enter new pattern for selected trades:");
    if (newPattern) {
      setTrades(trades.map(t => 
        selectedTradeIds.includes(t.id) ? { ...t, pattern: newPattern } : t
      ));
      setSelectedTradeIds([]);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedTrades: Trade[] = results.data.map((row: any) => {
          // Normalize keys to handle different casing
          const getVal = (keys: string[]) => {
            const key = keys.find(k => row[k] !== undefined || row[k.toLowerCase()] !== undefined || row[k.toUpperCase()] !== undefined);
            return key ? row[key] || row[key.toLowerCase()] || row[key.toUpperCase()] : undefined;
          };

          const symbol = (getVal(['Symbol', 'Ticker']) || '').toUpperCase();
          const side = (getVal(['Side', 'Type']) || 'long').toLowerCase() as 'long' | 'short';
          const sector = getVal(['Sector', 'Industry']) || 'Miscellaneous';
          const entryPrice = parseFloat(getVal(['EntryPrice', 'Price', 'Entry']) || '0');
          const exitPriceRaw = getVal(['ExitPrice', 'Exit']);
          const exitPrice = exitPriceRaw ? parseFloat(exitPriceRaw) : undefined;
          const quantity = parseFloat(getVal(['Quantity', 'Qty', 'Size']) || '0');
          const pattern = getVal(['Pattern', 'Strategy']) || 'Imported';
          const date = getVal(['Date', 'EntryDate']) || format(new Date(), 'yyyy-MM-dd');
          const exitDate = getVal(['ExitDate', 'CloseDate']);
          const notes = getVal(['Notes', 'Comment']) || '';

          return {
            id: crypto.randomUUID(),
            symbol,
            side,
            sector,
            entryPrice,
            exitPrice,
            quantity,
            pattern,
            date,
            exitDate,
            notes
          };
        }).filter((t: any) => t.symbol && t.entryPrice > 0 && t.quantity > 0);

        if (importedTrades.length > 0) {
          setTrades(prev => [...importedTrades, ...prev]);
          alert(`Successfully imported ${importedTrades.length} trades!`);
        } else {
          alert("No valid trades found in CSV. Please ensure your CSV has headers like: Symbol, Side, EntryPrice, Quantity, Pattern, Date");
        }
        e.target.value = '';
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        alert("Failed to parse CSV file.");
      }
    });
  };

  const downloadCSVTemplate = () => {
    const headers = ['Symbol', 'Side', 'Sector', 'EntryPrice', 'ExitPrice', 'Quantity', 'Pattern', 'Date', 'ExitDate', 'Notes'];
    const example = ['AAPL', 'long', 'Electronic Technology', '150.50', '155.00', '10', 'Breakout', '2024-03-01', '2024-03-02', 'Strong volume'];
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tradelog_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateProfit = (trade: Trade) => {
    if (trade.exitPrice === undefined || trade.exitPrice === null) return 0;
    const diff = trade.side === 'long' 
      ? trade.exitPrice - trade.entryPrice 
      : trade.entryPrice - trade.exitPrice;
    return diff * trade.quantity;
  };

  const calculateProfitPercent = (trade: Trade) => {
    if (trade.exitPrice === undefined || trade.exitPrice === null) return 0;
    const diff = trade.side === 'long' 
      ? trade.exitPrice - trade.entryPrice 
      : trade.entryPrice - trade.exitPrice;
    return (diff / trade.entryPrice) * 100;
  };

  const closeTrade = (id: string, exitPrice: number) => {
    const exitDate = format(new Date(), 'yyyy-MM-dd');
    setTrades(trades.map(t => t.id === id ? { ...t, exitPrice, exitDate } : t));
  };

  // Analytics Data
  const stats = React.useMemo(() => {
    const closedTrades = trades.filter(t => t.exitPrice !== undefined && t.exitPrice !== null);
    const openTrades = trades.filter(t => t.exitPrice === undefined || t.exitPrice === null);
    
    if (trades.length === 0) return null;

    const wins = closedTrades.filter(t => calculateProfit(t) > 0).length;
    const totalProfit = closedTrades.reduce((acc, t) => acc + calculateProfit(t), 0);
    
    // Win Rate by Symbol
    const symbolStats: Record<string, { wins: number; total: number; profit: number }> = {};
    const patternStats: Record<string, { wins: number; total: number; profit: number }> = {};

    closedTrades.forEach(t => {
      const profit = calculateProfit(t);
      const isWin = profit > 0;

      // Symbol
      if (!symbolStats[t.symbol]) symbolStats[t.symbol] = { wins: 0, total: 0, profit: 0 };
      symbolStats[t.symbol].total++;
      if (isWin) symbolStats[t.symbol].wins++;
      symbolStats[t.symbol].profit += profit;

      // Pattern
      if (!patternStats[t.pattern]) patternStats[t.pattern] = { wins: 0, total: 0, profit: 0 };
      patternStats[t.pattern].total++;
      if (isWin) patternStats[t.pattern].wins++;
      patternStats[t.pattern].profit += profit;
    });

    const winRateBySymbol = Object.entries(symbolStats).map(([name, data]) => ({
      name,
      winRate: Math.round((data.wins / data.total) * 100),
      profit: data.profit,
      total: data.total
    }));

    const winRateByPattern = Object.entries(patternStats).map(([name, data]) => ({
      name,
      winRate: Math.round((data.wins / data.total) * 100),
      profit: data.profit,
      total: data.total
    }));

    // Sector Stats
    const sectorStats: Record<string, { wins: number; total: number; profit: number }> = {};
    closedTrades.forEach(t => {
      const profit = calculateProfit(t);
      const isWin = profit > 0;
      if (!sectorStats[t.sector]) sectorStats[t.sector] = { wins: 0, total: 0, profit: 0 };
      sectorStats[t.sector].total++;
      if (isWin) sectorStats[t.sector].wins++;
      sectorStats[t.sector].profit += profit;
    });

    const winRateBySector = Object.entries(sectorStats).map(([name, data]) => ({
      name,
      winRate: Math.round((data.wins / data.total) * 100),
      profit: data.profit,
      total: data.total
    }));

    // Time Period Stats
    const now = new Date();
    const periods = [
      { name: '1W', date: subWeeks(now, 1) },
      { name: '1M', date: subMonths(now, 1) },
      { name: '3M', date: subMonths(now, 3) },
      { name: '1Y', date: subYears(now, 1) },
      { name: 'All', date: new Date(0) },
    ];

    const statsByPeriod = periods.map(period => {
      const filteredTrades = closedTrades.filter(t => isAfter(parseISO(t.exitDate || t.date), period.date));
      const wins = filteredTrades.filter(t => calculateProfit(t) > 0).length;
      const profit = filteredTrades.reduce((acc, t) => acc + calculateProfit(t), 0);
      const winRate = filteredTrades.length > 0 ? Math.round((wins / filteredTrades.length) * 100) : 0;
      return {
        name: period.name,
        profit,
        winRate,
        total: filteredTrades.length
      };
    });

    const equityCurve = [...closedTrades]
      .sort((a, b) => parseISO(a.exitDate || a.date).getTime() - parseISO(b.exitDate || b.date).getTime())
      .reduce((acc: any[], t, i) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].balance : 0;
        acc.push({
          trade: i + 1,
          balance: prev + calculateProfit(t),
          date: format(parseISO(t.exitDate || t.date), 'MMM dd')
        });
        return acc;
      }, []);

    // Avg Open Trades per Week
    const weeks: Record<string, Set<string>> = {};
    trades.forEach(t => {
      const date = parseISO(t.date);
      const weekKey = `${format(date, 'yyyy')}-W${format(date, 'ww')}`;
      if (!weeks[weekKey]) weeks[weekKey] = new Set();
      weeks[weekKey].add(t.id);
    });
    
    const openTradesByWeek: Record<string, number> = {};
    trades.forEach(t => {
      const date = parseISO(t.date);
      const weekKey = `${format(date, 'yyyy')}-W${format(date, 'ww')}`;
      if (t.exitPrice === undefined || t.exitPrice === null) {
        openTradesByWeek[weekKey] = (openTradesByWeek[weekKey] || 0) + 1;
      }
    });

    const totalWeeks = Object.keys(weeks).length || 1;
    const avgOpenPerWeek = openTrades.length / totalWeeks;

    return {
      totalTrades: closedTrades.length,
      openTradesCount: openTrades.length,
      avgOpenPerWeek: avgOpenPerWeek.toFixed(1),
      winRate: closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0,
      totalProfit,
      avgProfit: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0,
      winRateByPattern,
      winRateBySector,
      statsByPeriod,
      equityCurve
    };
  }, [trades]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">TradeLog Pro</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Performance Analytics</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === 'journal' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <List size={16} /> Journal
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 mr-2">
            <button 
              onClick={downloadCSVTemplate}
              className="text-slate-400 hover:text-indigo-600 transition-colors"
              title="Download CSV Template"
            >
              <Info size={18} />
            </button>
          </div>
          <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <Upload size={18} /> <span className="hidden sm:inline">Import CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleImportCSV}
            />
          </label>
          <button 
            onClick={() => setIsAddingTrade(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus size={18} /> <span className="hidden sm:inline">New Trade</span>
            <Plus size={18} className="sm:hidden" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard 
                title="Total Profit" 
                value={`$${stats?.totalProfit.toLocaleString() || '0'}`} 
                trend={stats?.totalProfit && stats.totalProfit > 0 ? 'up' : 'down'}
                subtitle="Closed trades performance"
              />
              <StatsCard 
                title="Win Rate" 
                value={`${stats?.winRate || 0}%`} 
                trend={stats?.winRate && stats.winRate > 50 ? 'up' : 'neutral'}
                subtitle={`${stats?.totalTrades || 0} closed trades`}
              />
              <StatsCard 
                title="Avg. Profit" 
                value={`$${Math.round(stats?.avgProfit || 0).toLocaleString()}`} 
                trend={stats?.avgProfit && stats.avgProfit > 0 ? 'up' : 'down'}
                subtitle="Per closed trade"
              />
              <StatsCard 
                title="Open Trades" 
                value={stats?.openTradesCount.toString() || '0'} 
                trend="neutral"
                subtitle="Currently active"
              />
              <StatsCard 
                title="Avg Open / Week" 
                value={stats?.avgOpenPerWeek || '0'} 
                trend="neutral"
                subtitle="Weekly activity"
              />
              <StatsCard 
                title="Best Pattern" 
                value={[...(stats?.winRateByPattern || [])].sort((a, b) => b.winRate - a.winRate)[0]?.name || 'N/A'} 
                trend="neutral"
                subtitle="Highest win rate"
              />
              <StatsCard 
                title="Best Sector" 
                value={[...(stats?.winRateBySector || [])].sort((a, b) => b.profit - a.profit)[0]?.name || 'N/A'} 
                trend="neutral"
                subtitle="Most profitable"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equity Curve */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Equity Growth</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats?.equityCurve || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: any) => [`$${v.toLocaleString()}`, 'Balance']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win Rate by Pattern */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Win % by Pattern</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.winRateByPattern || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: any) => [`${v}%`, 'Win Rate']}
                      />
                      <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                        {stats?.winRateByPattern.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Profit by Time Period */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Profit by Time Period</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.statsByPeriod || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: any) => [`$${v.toLocaleString()}`, 'Profit']}
                      />
                      <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                        {stats?.statsByPeriod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win Rate by Time Period */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Win % by Time Period</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.statsByPeriod || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: any) => [`${v}%`, 'Win Rate']}
                      />
                      <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                        {stats?.statsByPeriod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Profit by Sector */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Profit by Sector</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.winRateBySector || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v}`} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={120} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: any) => [`$${v.toLocaleString()}`, 'Profit']}
                      />
                      <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                        {stats?.winRateBySector.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {selectedTradeIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-indigo-900">{selectedTradeIds.length} trades selected</span>
                    <div className="h-4 w-px bg-indigo-200" />
                    <button 
                      onClick={toggleSelectAll}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {selectedTradeIds.length === trades.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={bulkUpdatePattern}
                      className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                    >
                      Update Pattern
                    </button>
                    <button 
                      onClick={deleteSelectedTrades}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete Selected
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={trades.length > 0 && selectedTradeIds.length === trades.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entry Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sector</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Side</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entry</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Exit</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profit</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pattern</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trades.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                          No trades logged yet. Start by adding your first trade!
                        </td>
                      </tr>
                    ) : (
                      trades.map((trade) => {
                        const isClosed = trade.exitPrice !== undefined && trade.exitPrice !== null;
                        const isSelected = selectedTradeIds.includes(trade.id);
                        const profit = calculateProfit(trade);
                        const profitPct = calculateProfitPercent(trade);
                        return (
                          <motion.tr 
                            key={trade.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "hover:bg-slate-50 transition-colors group",
                              isSelected && "bg-indigo-50/50"
                            )}
                          >
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={isSelected}
                                onChange={() => toggleSelectTrade(trade.id)}
                              />
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {format(parseISO(trade.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                              {trade.symbol}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 italic">
                              {trade.sector}
                            </td>
                            <td className="px-6 py-4 text-sm">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              trade.side === 'long' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-600">
                            ${trade.entryPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-600">
                            {isClosed ? `$${trade.exitPrice?.toFixed(2)}` : (
                              <button 
                                onClick={() => {
                                  const price = prompt("Enter exit price:");
                                  if (price && !isNaN(parseFloat(price))) {
                                    closeTrade(trade.id, parseFloat(price));
                                  }
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs underline"
                              >
                                CLOSE TRADE
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {isClosed ? (
                              <div className={cn(
                                "font-bold",
                                profit >= 0 ? "text-emerald-600" : "text-red-600"
                              )}>
                                {profit >= 0 ? '+' : ''}${Math.abs(profit).toLocaleString()}
                                <span className="text-[10px] ml-1 font-medium opacity-70">
                                  ({profitPct.toFixed(2)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">OPEN</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                              {trade.pattern}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setEditingTrade(trade)}
                                className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                                title="Edit Trade"
                              >
                                <History size={16} />
                              </button>
                              <button 
                                onClick={() => deleteTrade(trade.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                title="Delete Trade"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>

      {/* Add/Edit Trade Modal */}
      <AnimatePresence>
        {(isAddingTrade || editingTrade) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingTrade(false);
                setEditingTrade(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="font-bold text-slate-900">{editingTrade ? 'Edit Trade' : 'Log New Trade'}</h2>
                <button 
                  onClick={() => {
                    setIsAddingTrade(false);
                    setEditingTrade(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              <TradeForm 
                initialData={editingTrade || undefined}
                onSubmit={(data) => {
                  if (editingTrade) {
                    updateTrade(editingTrade.id, data);
                  } else {
                    addTrade(data);
                  }
                }} 
                onCancel={() => {
                  setIsAddingTrade(false);
                  setEditingTrade(null);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ title, value, trend, subtitle }: { title: string, value: string, trend: 'up' | 'down' | 'neutral', subtitle: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        {trend === 'up' && <TrendingUp size={16} className="text-emerald-500" />}
        {trend === 'down' && <TrendingDown size={16} className="text-red-500" />}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
    </div>
  );
}

function TradeForm({ onSubmit, onCancel, initialData }: { onSubmit: (trade: Omit<Trade, 'id'>) => void, onCancel: () => void, initialData?: Trade }) {
  const [formData, setFormData] = useState({
    symbol: initialData?.symbol || '',
    sector: initialData?.sector || 'Miscellaneous',
    entryPrice: initialData?.entryPrice?.toString() || '',
    exitPrice: initialData?.exitPrice?.toString() || '',
    quantity: initialData?.quantity?.toString() || '',
    pattern: initialData?.pattern || '',
    side: initialData?.side || 'long' as 'long' | 'short',
    date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
    exitDate: initialData?.exitDate || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exitPrice = formData.exitPrice ? parseFloat(formData.exitPrice) : undefined;
    const exitDate = formData.exitDate || undefined;
    onSubmit({
      ...formData,
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice,
      exitDate,
      quantity: parseFloat(formData.quantity),
      symbol: formData.symbol.toUpperCase(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Symbol</label>
          <input 
            required
            type="text" 
            placeholder="e.g. BTCUSDT"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={formData.symbol}
            onChange={e => setFormData({ ...formData, symbol: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Side</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, side: 'long' })}
              className={cn(
                "flex-1 py-1 text-xs font-bold rounded-md transition-all",
                formData.side === 'long' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
              )}
            >LONG</button>
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, side: 'short' })}
              className={cn(
                "flex-1 py-1 text-xs font-bold rounded-md transition-all",
                formData.side === 'short' ? "bg-white text-red-600 shadow-sm" : "text-slate-500"
              )}
            >SHORT</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Entry</label>
          <input 
            required
            type="number" 
            step="any"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            value={formData.entryPrice}
            onChange={e => setFormData({ ...formData, entryPrice: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Exit (Optional)</label>
          <input 
            type="number" 
            step="any"
            placeholder="Leave blank if open"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            value={formData.exitPrice}
            onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Qty</label>
          <input 
            required
            type="number" 
            step="any"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
            value={formData.quantity}
            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Pattern</label>
          <select 
            required
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={formData.pattern}
            onChange={e => setFormData({ ...formData, pattern: e.target.value })}
          >
            <option value="">Select Pattern</option>
            <option value="Breakout">Breakout</option>
            <option value="Mean Reversion">Mean Reversion</option>
            <option value="Trend Following">Trend Following</option>
            <option value="Double Bottom">Double Bottom</option>
            <option value="Head & Shoulders">Head & Shoulders</option>
            <option value="Scalp">Scalp</option>
            <option value="Imported">Imported</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Sector (Optional)</label>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={formData.sector}
            onChange={e => setFormData({ ...formData, sector: e.target.value })}
          >
            <option value="Miscellaneous">Select Sector</option>
            {SECTORS.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Entry Date</label>
          <input 
            required
            type="date" 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Exit Date</label>
          <input 
            type="date" 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={formData.exitDate}
            onChange={e => setFormData({ ...formData, exitDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
        <textarea 
          rows={2}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="pt-4 flex gap-3">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg transition-colors"
        >Cancel</button>
        <button 
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition-colors shadow-lg shadow-indigo-200"
        >
          {initialData ? 'Update Trade' : 'Save Trade'}
        </button>
      </div>
    </form>
  );
}
