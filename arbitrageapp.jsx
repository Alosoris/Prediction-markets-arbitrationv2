import React, { useState, useEffect } from 'react';
import { Trash2, Plus, TrendingUp, Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ArbitrageDashboard() {
  const [tab, setTab] = useState('calculator');
  const [arbitrages, setArbitrages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedArb, setExpandedArb] = useState(null);
  
  const [formData, setFormData] = useState({
    event: '',
    market1Url: '',
    market2Url: '',
    market1Price: '',
    market2Price: '',
    capital: '',
    dateEntry: new Date().toISOString().split('T')[0],
    dateExpiry: '',
    platform1Profit: '',
    platform2Profit: '',
  });

  const [calcData, setCalcData] = useState({
    market1Price: '',
    market2Price: '',
    totalCapital: '',
    sliderValue: 50,
  });
  const [calcResult, setCalcResult] = useState(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveData, setSaveData] = useState({
    event: '',
    market1Url: '',
    market2Url: '',
    dateEntry: new Date().toISOString().split('T')[0],
    dateExpiry: '',
    platformProfit: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await window.storage.get('arbitrage_data');
      if (result && result.value) {
        setArbitrages(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No data');
    }
    setLoading(false);
  };

  const saveDataToStorage = async (newArbitrages) => {
    try {
      await window.storage.set('arbitrage_data', JSON.stringify(newArbitrages));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const calculateArbitrage = (p1, p2, capital, stake1) => {
    const price1 = p1 / 100;
    const price2 = p2 / 100;
    const stake2 = capital - stake1;
    const payout1 = stake1 / price1;
    const payout2 = stake2 / (1 - price2);
    const profit1 = payout1 - capital;
    const profit2 = payout2 - capital;
    const minProfit = Math.min(profit1, profit2);
    const profitPct = (minProfit / capital) * 100;
    const chartData = [];
    for (let s1 = 0; s1 <= capital; s1 += capital / 50) {
      const s2 = capital - s1;
      const p1_profit = (s1 / price1) - capital;
      const p2_profit = (s2 / (1 - price2)) - capital;
      chartData.push({
        stake1: Math.round(s1),
        profit1: Math.round(p1_profit * 100) / 100,
        profit2: Math.round(p2_profit * 100) / 100,
        minProfit: Math.min(p1_profit, p2_profit),
      });
    }
    return {
      stake1: Math.round(stake1 * 100) / 100,
      stake2: Math.round(stake2 * 100) / 100,
      profit1: Math.round(profit1 * 100) / 100,
      profit2: Math.round(profit2 * 100) / 100,
      minProfit: Math.round(minProfit * 100) / 100,
      profitPct: Math.round(profitPct * 100) / 100,
      chartData,
    };
  };

  const findOptimalScenario = (p1, p2) => {
    const price1 = p1 / 100;
    const price2 = p2 / 100;
    const scenario1Cost = price1 + (1 - price2);
    const scenario2Cost = price2 + (1 - price1);
    if (scenario1Cost < 1 && scenario2Cost < 1) {
      return scenario1Cost < scenario2Cost ? 1 : 2;
    } else if (scenario1Cost < 1) {
      return 1;
    } else if (scenario2Cost < 1) {
      return 2;
    }
    return null;
  };

  const handleCalculate = () => {
    if (!calcData.market1Price || !calcData.market2Price || !calcData.totalCapital) {
      alert('Please fill all fields');
      return;
    }
    const p1 = parseFloat(calcData.market1Price);
    const p2 = parseFloat(calcData.market2Price);
    const capital = parseFloat(calcData.totalCapital);
    const optimalScenario = findOptimalScenario(p1, p2);
    if (!optimalScenario) {
      alert('No arbitrage opportunity found');
      return;
    }
    const price1 = p1 / 100;
    const price2 = p2 / 100;
    let stake1;
    let position1, position2;
    if (optimalScenario === 1) {
      const cost = price1 + (1 - price2);
      stake1 = capital * (price1 / cost);
      position1 = 'YES';
      position2 = 'NO';
    } else {
      const cost = price2 + (1 - price1);
      stake1 = capital * ((1 - price1) / cost);
      position1 = 'NO';
      position2 = 'YES';
    }
    const result = calculateArbitrage(p1, p2, capital, stake1);
    result.position1 = position1;
    result.position2 = position2;
    setCalcResult(result);
    
    const maxMinProfit = Math.max(...result.chartData.map(d => d.minProfit));
    const optimalPoint = result.chartData.find(d => d.minProfit === maxMinProfit);
    const optimalSliderValue = optimalPoint ? (optimalPoint.stake1 / capital) * 100 : 50;
    
    setCalcData({ ...calcData, sliderValue: optimalSliderValue });
    setShowSaveForm(false);
  };

  const handleSaveFromCalc = () => {
    if (!saveData.event) {
      alert('Enter the event');
      return;
    }
    const newArbitrage = {
      id: Date.now(),
      event: saveData.event,
      market1Url: saveData.market1Url,
      market2Url: saveData.market2Url,
      market1Price: parseFloat(calcData.market1Price),
      market2Price: parseFloat(calcData.market2Price),
      capital: parseFloat(calcData.totalCapital),
      profitPct: calcResult.profitPct,
      profit: calcResult.minProfit,
      platformProfit: saveData.platformProfit ? parseFloat(saveData.platformProfit) : null,
      dateEntry: saveData.dateEntry,
      dateExpiry: saveData.dateExpiry,
      position1: calcResult.position1,
      position2: calcResult.position2,
      scenario: 'Arbitrage',
    };
    const updated = [...arbitrages, newArbitrage];
    setArbitrages(updated);
    saveDataToStorage(updated);
    setShowSaveForm(false);
    setCalcData({ market1Price: '', market2Price: '', totalCapital: '', sliderValue: 50 });
    setSaveData({
      event: '',
      market1Url: '',
      market2Url: '',
      dateEntry: new Date().toISOString().split('T')[0],
      dateExpiry: '',
      platformProfit: '',
    });
    setCalcResult(null);
  };

  const handleAddArbitrage = () => {
    if (!formData.event || !formData.market1Price || !formData.market2Price || !formData.capital) {
      alert('Fill all fields');
      return;
    }
    const p1 = parseFloat(formData.market1Price);
    const p2 = parseFloat(formData.market2Price);
    const capital = parseFloat(formData.capital);
    const optimalScenario = findOptimalScenario(p1, p2);
    if (!optimalScenario) {
      alert('No opportunity');
      return;
    }
    const price1 = p1 / 100;
    const price2 = p2 / 100;
    let stake1;
    let position1, position2;
    if (optimalScenario === 1) {
      const cost = price1 + (1 - price2);
      stake1 = capital * (price1 / cost);
      position1 = 'YES';
      position2 = 'NO';
    } else {
      const cost = price2 + (1 - price1);
      stake1 = capital * ((1 - price1) / cost);
      position1 = 'NO';
      position2 = 'YES';
    }
    const result = calculateArbitrage(p1, p2, capital, stake1);
    const newArbitrage = {
      id: Date.now(),
      event: formData.event,
      market1Url: formData.market1Url,
      market2Url: formData.market2Url,
      market1Price: p1,
      market2Price: p2,
      capital: capital,
      profitPct: result.profitPct,
      profit: result.minProfit,
      platform1Profit: formData.platform1Profit ? parseFloat(formData.platform1Profit) : null,
      platform2Profit: formData.platform2Profit ? parseFloat(formData.platform2Profit) : null,
      dateEntry: formData.dateEntry,
      dateExpiry: formData.dateExpiry,
      position1: position1,
      position2: position2,
      scenario: optimalScenario === 1 ? 'YES M1 + NO M2' : 'YES M2 + NO M1',
    };
    const updated = [...arbitrages, newArbitrage];
    setArbitrages(updated);
    saveDataToStorage(updated);
    setFormData({
      event: '',
      market1Url: '',
      market2Url: '',
      market1Price: '',
      market2Price: '',
      capital: '',
      dateEntry: new Date().toISOString().split('T')[0],
      dateExpiry: '',
      platform1Profit: '',
      platform2Profit: '',
    });
  };

  const handleDelete = (id) => {
    const updated = arbitrages.filter(a => a.id !== id);
    setArbitrages(updated);
    saveDataToStorage(updated);
  };

  const shareToTwitter = (arb) => {
    const profit = arb.platformProfit || arb.profit;
    const profitPct = arb.platformProfit ? ((arb.platformProfit / arb.capital) * 100).toFixed(2) : arb.profitPct;
    const text = `💰 Arbitrage Alert!

Event: ${arb.event}
Capital: $${arb.capital.toFixed(2)}
Profit: $${profit.toFixed(2)} (+${profitPct}%)

Market 1: ${arb.position1} ${arb.market1Price}%
Market 2: ${arb.position2} ${arb.market2Price}%

🎯 Risk-free profit locked in! 🔒`;
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const stats = {
    total: arbitrages.length,
    totalCapital: arbitrages.reduce((sum, a) => sum + a.capital, 0),
    totalProfit: arbitrages.reduce((sum, a) => {
      const profit = (a.platform1Profit && a.platform2Profit) 
        ? Math.min(a.platform1Profit, a.platform2Profit)
        : (a.platformProfit || a.profit);
      return sum + profit;
    }, 0),
    avgReturn: arbitrages.length > 0 ? arbitrages.reduce((sum, a) => {
      const profit = (a.platform1Profit && a.platform2Profit) 
        ? Math.min(a.platform1Profit, a.platform2Profit)
        : (a.platformProfit || a.profit);
      return sum + ((profit / a.capital) * 100);
    }, 0) / arbitrages.length : 0,
  };

  if (loading) {
    return <div className="p-6 text-center text-white bg-blue-950 min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-emerald-950 p-6" style={{fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🔮 Arbitrage Dashboard</h1>
            <p className="text-blue-300">Track your arbitrage opportunities</p>
          </div>
          <a 
            href="https://x.com/Al0soris" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-bold py-3 px-6 rounded-lg border border-blue-700 hover:border-blue-500 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            @Al0soris
          </a>
        </div>

        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setTab('calculator')}
            className={`px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 ${tab === 'calculator' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            <Calculator size={20} /> Calculator
          </button>
          <button
            onClick={() => setTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 ${tab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            <TrendingUp size={20} /> Dashboard
          </button>
          <button
            onClick={() => setTab('platforms')}
            className={`px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 ${tab === 'platforms' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            <Plus size={20} /> Platforms
          </button>
        </div>

        {tab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-blue-700">
              <h2 className="text-xl font-bold text-white mb-6">Calculate</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">YES Price Market 1 (%)</label>
                  <input type="number" value={calcData.market1Price} onChange={(e) => setCalcData({ ...calcData, market1Price: e.target.value })} step="0.1" className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">YES Price Market 2 (%)</label>
                  <input type="number" value={calcData.market2Price} onChange={(e) => setCalcData({ ...calcData, market2Price: e.target.value })} step="0.1" className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Capital ($)</label>
                  <input type="number" value={calcData.totalCapital} onChange={(e) => setCalcData({ ...calcData, totalCapital: e.target.value })} step="0.01" className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <button onClick={handleCalculate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded">Calculate</button>
              </div>

              {calcResult && (
                <div className="mt-8 p-4 bg-slate-700 rounded-lg border border-emerald-600">
                  <h3 className="text-lg font-bold text-white mb-4">Results</h3>
                  <div className="mb-4 p-3 bg-slate-600 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Stake M1:</span>
                        <div className="text-2xl font-bold text-emerald-400">${calcResult.stake1}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Stake M2:</span>
                        <div className="text-2xl font-bold text-amber-400">${calcResult.stake2}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between p-2 bg-slate-600 rounded">
                      <span className="text-slate-300">If M1 wins:</span>
                      <span className="text-emerald-400 font-bold">${calcResult.profit1}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-600 rounded">
                      <span className="text-slate-300">If M2 wins:</span>
                      <span className="text-amber-400 font-bold">${calcResult.profit2}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-900 rounded border border-blue-600">
                      <span className="text-slate-300">Guaranteed profit:</span>
                      <span className="text-blue-300 font-bold text-lg">${calcResult.minProfit}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-blue-900 rounded border border-blue-600">
                      <span className="text-slate-300">Return:</span>
                      <span className="text-blue-300 font-bold text-lg">{calcResult.profitPct}%</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-slate-300 text-xs">Allocation:</p>
                      <p className="text-slate-400 text-xs">M1: {calcData.sliderValue.toFixed(0)}% | M2: {(100 - calcData.sliderValue).toFixed(0)}%</p>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={calcData.sliderValue}
                        onChange={(e) => {
                          const newSliderValue = parseFloat(e.target.value);
                          setCalcData({ ...calcData, sliderValue: newSliderValue });
                          const stake1 = (parseFloat(calcData.totalCapital) * newSliderValue) / 100;
                          const result = calculateArbitrage(
                            parseFloat(calcData.market1Price),
                            parseFloat(calcData.market2Price),
                            parseFloat(calcData.totalCapital),
                            stake1
                          );
                          setCalcResult(result);
                        }}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10b981 0%, #10b981 ${calcData.sliderValue}%, #f59e0b ${calcData.sliderValue}%, #f59e0b 100%)`
                        }}
                      />
                      {calcResult.chartData && (() => {
                        const maxMinProfit = Math.max(...calcResult.chartData.map(d => d.minProfit));
                        const optimalPoint = calcResult.chartData.find(d => d.minProfit === maxMinProfit);
                        const optimalPercent = optimalPoint ? (optimalPoint.stake1 / parseFloat(calcData.totalCapital)) * 100 : 50;
                        return (
                          <div
                            className="absolute top-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1"
                            style={{ left: `${optimalPercent}%` }}
                            title={`Max guaranteed profit at ${optimalPercent.toFixed(0)}%`}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>100% M1</span>
                      <span>100% M2</span>
                    </div>
                  </div>
                  <button onClick={() => setShowSaveForm(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded">Save</button>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-blue-700">
              {calcResult ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Profit Curve</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={calcResult.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="stake1" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} />
                      <Legend />
                      <Line type="monotone" dataKey={0} stroke="#64748b" strokeWidth={1} dot={false} />
                      <Line type="monotone" dataKey="profit1" stroke="#10b981" strokeWidth={3} dot={false} name="Profit M1" />
                      <Line type="monotone" dataKey="profit2" stroke="#f59e0b" strokeWidth={3} dot={false} name="Profit M2" />
                      <Line 
                        type="monotone" 
                        dataKey="minProfit" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={(props) => {
                          const maxMinProfit = Math.max(...calcResult.chartData.map(d => d.minProfit));
                          if (props.payload.minProfit === maxMinProfit) {
                            return <circle cx={props.cx} cy={props.cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                          }
                          return null;
                        }}
                        name="Guaranteed profit" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-slate-400">Calculate an arbitrage</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 rounded-lg p-6 border border-blue-700">
                <div className="text-blue-300 text-sm mb-1">Arbitrages</div>
                <div className="text-3xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-6 border border-blue-700">
                <div className="text-blue-300 text-sm mb-1">Total Capital</div>
                <div className="text-3xl font-bold text-white">${stats.totalCapital.toFixed(2)}</div>
              </div>
              <div className="bg-emerald-900 rounded-lg p-6 border border-emerald-600">
                <div className="text-emerald-300 text-sm mb-1">Total Profit</div>
                <div className="text-3xl font-bold text-emerald-200">${stats.totalProfit.toFixed(2)}</div>
              </div>
              <div className="bg-blue-900 rounded-lg p-6 border border-blue-600">
                <div className="text-blue-300 text-sm mb-1">Average Return</div>
                <div className="text-3xl font-bold text-blue-200">{stats.avgReturn.toFixed(2)}%</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-blue-700 mb-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Plus size={20} /> Add Arbitrage
              </h2>
              <div className="space-y-3">
                <input type="text" placeholder="Event" value={formData.event} onChange={(e) => setFormData({ ...formData, event: e.target.value })} className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Entry Date</label>
                    <input type="date" value={formData.dateEntry} onChange={(e) => setFormData({ ...formData, dateEntry: e.target.value })} className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Expiry Date</label>
                    <input type="date" value={formData.dateExpiry} onChange={(e) => setFormData({ ...formData, dateExpiry: e.target.value })} className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="url" placeholder="Market 1 URL" value={formData.market1Url} onChange={(e) => setFormData({ ...formData, market1Url: e.target.value })} className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  <input type="url" placeholder="Market 2 URL" value={formData.market2Url} onChange={(e) => setFormData({ ...formData, market2Url: e.target.value })} className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="number" placeholder="YES Price Market 1 (%)" value={formData.market1Price} onChange={(e) => setFormData({ ...formData, market1Price: e.target.value })} step="0.1" className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  <input type="number" placeholder="YES Price Market 2 (%)" value={formData.market2Price} onChange={(e) => setFormData({ ...formData, market2Price: e.target.value })} step="0.1" className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  <input type="number" placeholder="Capital ($)" value={formData.capital} onChange={(e) => setFormData({ ...formData, capital: e.target.value })} step="0.01" className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Platform 1 Estimated Profit ($) - Optional</label>
                    <input type="number" placeholder="After fees & slippage M1" value={formData.platform1Profit} onChange={(e) => setFormData({ ...formData, platform1Profit: e.target.value })} step="0.01" className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Platform 2 Estimated Profit ($) - Optional</label>
                    <input type="number" placeholder="After fees & slippage M2" value={formData.platform2Profit} onChange={(e) => setFormData({ ...formData, platform2Profit: e.target.value })} step="0.01" className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                  </div>
                </div>
              </div>
              <button onClick={handleAddArbitrage} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded transition mt-4">Save</button>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-blue-700">
              <h2 className="text-xl font-bold text-white mb-6">History</h2>
              {arbitrages.length === 0 ? (
                <p className="text-slate-400">No arbitrage recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-3 px-4 text-slate-300">Event</th>
                        <th className="text-left py-3 px-4 text-slate-300">Markets</th>
                        <th className="text-left py-3 px-4 text-slate-300">Entry</th>
                        <th className="text-left py-3 px-4 text-slate-300">Expiry</th>
                        <th className="text-right py-3 px-4 text-slate-300">Prices</th>
                        <th className="text-right py-3 px-4 text-slate-300">Capital</th>
                        <th className="text-right py-3 px-4 text-slate-300">Profit</th>
                        <th className="text-right py-3 px-4 text-slate-300">Return</th>
                        <th className="text-center py-3 px-4 text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arbitrages.map((arb) => (
                        <React.Fragment key={arb.id}>
                          <tr className="border-b border-slate-600 hover:bg-slate-700">
                            <td className="py-3 px-4 text-white">{arb.event}</td>
                            <td className="py-3 px-4 text-slate-300">
                              <div className="flex flex-col gap-1">
                                {arb.market1Url ? (
                                  <a href={arb.market1Url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">
                                    🔗 M1 ({arb.position1 || 'YES'} {arb.market1Price}%)
                                  </a>
                                ) : (
                                  <span className="text-slate-500 text-xs">M1 ({arb.position1 || 'YES'} {arb.market1Price}%)</span>
                                )}
                                {arb.market2Url ? (
                                  <a href={arb.market2Url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">
                                    🔗 M2 ({arb.position2 || 'NO'} {arb.market2Price}%)
                                  </a>
                                ) : (
                                  <span className="text-slate-500 text-xs">M2 ({arb.position2 || 'NO'} {arb.market2Price}%)</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{arb.dateEntry}</td>
                            <td className="py-3 px-4 text-slate-300">{arb.dateExpiry}</td>
                            <td className="py-3 px-4 text-right text-slate-300">{arb.market1Price}% / {arb.market2Price}%</td>
                            <td className="py-3 px-4 text-right text-white">${arb.capital.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-emerald-400 font-bold">${(() => {
                              if (arb.platform1Profit && arb.platform2Profit) {
                                return Math.min(arb.platform1Profit, arb.platform2Profit).toFixed(2);
                              }
                              return (arb.platformProfit || arb.profit).toFixed(2);
                            })()}</td>
                            <td className="py-3 px-4 text-right text-blue-300 font-bold">{(() => {
                              if (arb.platform1Profit && arb.platform2Profit) {
                                const minProfit = Math.min(arb.platform1Profit, arb.platform2Profit);
                                return ((minProfit / arb.capital) * 100).toFixed(2);
                              }
                              return (arb.platformProfit ? ((arb.platformProfit / arb.capital) * 100) : arb.profitPct).toFixed(2);
                            })()}%</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button onClick={() => setExpandedArb(expandedArb === arb.id ? null : arb.id)} className="text-blue-400 hover:text-blue-300" title="Details">
                                  <Plus size={18} />
                                </button>
                                <button onClick={() => shareToTwitter(arb)} className="text-green-400 hover:text-green-300" title="Share on Twitter">
                                  <TrendingUp size={18} />
                                </button>
                                <button onClick={() => handleDelete(arb.id)} className="text-red-400 hover:text-red-300" title="Delete">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedArb === arb.id && (
                            <tr className="bg-slate-700">
                              <td colSpan="9" className="py-4 px-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-400">Theoretical Profit:</span>
                                    <div className="text-white font-bold">${arb.profit.toFixed(2)} ({arb.profitPct.toFixed(2)}%)</div>
                                  </div>
                                  {arb.platform1Profit && (
                                    <div>
                                      <span className="text-slate-400">Platform 1 Profit:</span>
                                      <div className="text-emerald-400 font-bold">${arb.platform1Profit.toFixed(2)}</div>
                                    </div>
                                  )}
                                  {arb.platform2Profit && (
                                    <div>
                                      <span className="text-slate-400">Platform 2 Profit:</span>
                                      <div className="text-emerald-400 font-bold">${arb.platform2Profit.toFixed(2)}</div>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-slate-400">Capital Invested:</span>
                                    <div className="text-white font-bold">${arb.capital.toFixed(2)}</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Position M1:</span>
                                    <div className="text-white font-bold">{arb.position1 || 'YES'} @ {arb.market1Price}%</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Position M2:</span>
                                    <div className="text-white font-bold">{arb.position2 || 'NO'} @ {arb.market2Price}%</div>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Scenario:</span>
                                    <div className="text-white font-bold">{arb.scenario}</div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'platforms' && (
          <div className="bg-slate-800 rounded-lg p-8 border border-blue-700">
            <h2 className="text-3xl font-bold text-white mb-4">🎯 Arbitrage Platforms</h2>
            <p className="text-blue-300 mb-8">Start arbitraging on these prediction market platforms</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-700 rounded-lg p-6 border border-yellow-500 hover:border-yellow-400 transition">
                <div className="flex items-center justify-center h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded mb-4">
                  <span className="text-5xl font-bold text-black">L</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Limitless</h3>
                <p className="text-yellow-400 text-sm font-bold mb-2">$17M Raised</p>
                <p className="text-slate-300 text-sm mb-4">High liquidity prediction market</p>
                <a href="https://limitless.exchange/?r=4KGMVNGFJY" target="_blank" rel="noopener noreferrer" className="block w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>

              <div className="bg-slate-700 rounded-lg p-6 border border-teal-500 hover:border-teal-400 transition">
                <div className="flex items-center justify-center h-32 bg-gradient-to-br from-teal-400 to-teal-600 rounded mb-4">
                  <span className="text-5xl font-bold text-white">K</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Kalshi</h3>
                <p className="text-teal-400 text-sm font-bold mb-2">$1.52B Raised 🔥</p>
                <p className="text-slate-300 text-sm mb-4">CFTC-regulated US markets</p>
                <a href="https://kalshi.com/" target="_blank" rel="noopener noreferrer" className="block w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>

              <div className="bg-slate-700 rounded-lg p-6 border border-blue-500 hover:border-blue-400 transition">
                <div className="flex items-center justify-center h-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded mb-4">
                  <span className="text-5xl font-bold text-white">P</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Polymarket</h3>
                <p className="text-blue-400 text-sm font-bold mb-2">$2.28B Raised 🚀</p>
                <p className="text-slate-300 text-sm mb-4">World's largest prediction market</p>
                <a href="https://polymarket.com/" target="_blank" rel="noopener noreferrer" className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>

              <div className="bg-slate-700 rounded-lg p-6 border border-pink-500 hover:border-pink-400 transition">
                <div className="flex items-center justify-center h-32 bg-white rounded mb-4 p-4">
                  <img src="https://i.imgur.com/hzTIUKJ.jpg" alt="XO Market" className="h-full w-auto object-contain" onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerHTML = '<span class="text-5xl font-bold text-black">XO</span>';}} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">XO Market</h3>
                <p className="text-pink-400 text-sm font-bold mb-2">$500K Raised</p>
                <p className="text-slate-300 text-sm mb-4">Code: XO-AL0SORIS-ACVG</p>
                <a href="https://beta.xo.market/" target="_blank" rel="noopener noreferrer" className="block w-full bg-pink-500 hover:bg-pink-600 text-black font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>

              <div className="bg-slate-700 rounded-lg p-6 border border-slate-300 hover:border-slate-200 transition">
                <div className="flex items-center justify-center h-32 bg-gradient-to-br from-slate-700 to-slate-900 rounded mb-4">
                  <span className="text-5xl font-bold text-white">O</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Opinion</h3>
                <p className="text-slate-300 text-sm font-bold mb-2">$5M + Binance 💎</p>
                <p className="text-slate-300 text-sm mb-4">Crypto-native markets</p>
                <a href="https://app.opinion.trade/macro" target="_blank" rel="noopener noreferrer" className="block w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>

              <div className="bg-slate-700 rounded-lg p-6 border border-slate-300 hover:border-slate-200 transition">
                <div className="flex items-center justify-center h-32 bg-gradient-to-br from-slate-700 to-slate-900 rounded mb-4">
                  <span className="text-5xl font-bold text-white">M</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Myriad Markets</h3>
                <p className="text-slate-300 text-sm font-bold mb-2">Emerging Platform</p>
                <p className="text-slate-300 text-sm mb-4">Community-driven markets</p>
                <a href="https://myriad.markets/markets" target="_blank" rel="noopener noreferrer" className="block w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>

              <div className="bg-slate-700 rounded-lg p-6 border border-indigo-500 hover:border-indigo-400 transition">
                <div className="flex items-center justify-center h-32 bg-slate-900 rounded mb-4 p-4">
                  <img src="https://i.ibb.co/mp4VZHk/Capture-d-cran-2025-12-03-175216.png" alt="Melee" className="h-full w-auto object-contain" onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerHTML = '<span class="text-5xl font-bold text-white">M</span>';}} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Melee</h3>
                <p className="text-indigo-400 text-sm font-bold mb-2">$3.5M Raised</p>
                <p className="text-slate-300 text-sm mb-4">Code: Al0soris</p>
                <a href="https://alpha.melee.markets/invite?inviteCode=Al0soris" target="_blank" rel="noopener noreferrer" className="block w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 rounded text-center">
                  Sign Up →
                </a>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-900 border border-blue-600 rounded-lg">
              <h3 className="text-xl font-bold text-white mb-2">💡 Pro Tip</h3>
              <p className="text-blue-200">Sign up on multiple platforms to maximize arbitrage opportunities. More platforms = more profit potential!</p>
            </div>
          </div>
        )}

        {showSaveForm && calcResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg p-8 border border-blue-600 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Save Arbitrage</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Event *</label>
                  <input type="text" placeholder="Fed decision" value={saveData.event} onChange={(e) => setSaveData({ ...saveData, event: e.target.value })} className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Entry Date</label>
                  <input type="date" value={saveData.dateEntry} onChange={(e) => setSaveData({ ...saveData, dateEntry: e.target.value })} className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Expiry Date</label>
                  <input type="date" value={saveData.dateExpiry} onChange={(e) => setSaveData({ ...saveData, dateExpiry: e.target.value })} className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Market 1 URL</label>
                  <input type="url" value={saveData.market1Url} onChange={(e) => setSaveData({ ...saveData, market1Url: e.target.value })} className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Market 2 URL</label>
                  <input type="url" value={saveData.market2Url} onChange={(e) => setSaveData({ ...saveData, market2Url: e.target.value })} className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-1">Platform Estimated Profit ($) - Optional</label>
                  <input type="number" placeholder="After fees & slippage" value={saveData.platformProfit} onChange={(e) => setSaveData({ ...saveData, platformProfit: e.target.value })} step="0.01" className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 outline-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSaveFromCalc} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded">Save</button>
                  <button onClick={() => setShowSaveForm(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
