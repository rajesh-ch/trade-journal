export interface Trade {
  id: string;
  symbol: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pattern: string;
  sector: string;
  date: string;
  exitDate?: string;
  side: 'long' | 'short';
  notes?: string;
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  avgProfit: number;
  profitBySymbol: Record<string, number>;
  winRateBySymbol: Record<string, { wins: number; total: number }>;
  winRateByPattern: Record<string, { wins: number; total: number }>;
  dailyProfit: Record<string, number>;
}
