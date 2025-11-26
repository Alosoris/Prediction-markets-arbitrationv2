import React, { useState, useEffect } from 'react';
import { Trash2, Plus, TrendingUp, Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ArbitrageDashboard() {
  const [tab, setTab] = useState('dashboard');
  const [arbitrages, setArbitrages] = useState([]);
  const [loading, setLoading] = useState(true);

  // État pour le formulaire principal
  const [formData, setFormData] = useState({
    event: '',
    market1Url: '',
    market2Url: '',
    market1Price: '',
    market2Price: '',
    capital: '',
    dateEntry: new Date().toISOString().split('T')[0],
    dateExpiry: '',
  });

  // État pour la calculatrice
  const [calcData, setCalcData] = useState({
    market1Price: '',
    market2Price: '',
    totalCapital: '',
    stake1: '',
  });
  const [calcResult, setCalcResult] = useState(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveData, setSaveData] = useState({
    event: '',
    market1Url: '',
    market2Url: '',
    dateEntry: new Date().toISOString().split('T')[0],
    dateExpiry: '',
  });

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, []);

  // Charger depuis le stockage persistent
  const loadData = async () => {
    try {
      const result = localStorage.getItem('arbitrage_data');
      if (result) {
        setArbitrages(JSON.parse(result));
      }
    } catch (error) {
      console.log('Pas de données existantes');
    }
    setLoading(false);
  };

  // Sauvegarder les données
  const saveDataToStorage = async (newArbitrages) => {
    try {
      localStorage.setItem('arbitrage_data', JSON.stringify(newArbitrages));
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
    }
  };

  // Calculer les indicateurs de performance
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

    // Générer les données pour le graphique
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
      payout1: Math.round(payout1 * 100) / 100,
      payout2: Math.round(payout2 * 100) / 100,
      profit1: Math.round(profit1 * 100) / 100,
      profit2: Math.round(profit2 * 100) / 100,
      minProfit: Math.round(minProfit * 100) / 100,
      profitPct: Math.round(profitPct * 100) / 100,
      chartData,
    };
  };

  // Trouver le meilleur scénario automatiquement
  const findOptimalScenario = (p1, p2) => {
    const price1 = p1 / 100;
    const price2 = p2 / 100;

    // Scénario 1: YES sur M1 + NO sur M2
    const scenario1Cost = price1 + (1 - price2);

    // Scénario 2: YES sur M2 + NO sur M1
    const scenario2Cost = price2 + (1 - price1);

    // Retourner le scénario viable avec le meilleur coût
    if (scenario1Cost < 1 && scenario2Cost < 1) {
      return scenario1Cost < scenario2Cost ? 1 : 2;
    } else if (scenario1Cost < 1) {
      return 1;
    } else if (scenario2Cost < 1) {
      return 2;
    }
    return null;
  };

  // Gérer le calcul dans la calculatrice
  const handleCalculate = () => {
    if (!calcData.market1Price || !calcData.market2Price || !calcData.totalCapital) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const p1 = parseFloat(calcData.market1Price);
    const p2 = parseFloat(calcData.market2Price);
    const capital = parseFloat(calcData.totalCapital);

    const optimalScenario = findOptimalScenario(p1, p2);
    if (!optimalScenario) {
      alert('Pas d\'opportunité d\'arbitrage trouvée pour ces prix');
      return;
    }

    const price1 = p1 / 100;
    const price2 = p2 / 100;

    let stake1;
    if (optimalScenario === 1) {
      const cost = price1 + (1 - price2);
      stake1 = capital * (price1 / cost);
    } else {
      const cost = price2 + (1 - price1);
      stake1 = capital * ((1 - price1) / cost);
    }

    const result = calculateArbitrage(p1, p2, capital, stake1);
    setCalcResult(result);
    setShowSaveForm(false);
  };

  // Sauvegarder depuis la calculatrice
  const handleSaveFromCalc = () => {
    if (!saveData.event) {
      alert('Veuillez entrer l\'événement');
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
      dateEntry: saveData.dateEntry,
      dateExpiry: saveData.dateExpiry,
      scenario: 'Arbitrage',
    };

    const updated = [...arbitrages, newArbitrage];
    setArbitrages(updated);
    saveDataToStorage(updated);

    setShowSaveForm(false);
    setCalcData({ market1Price: '', market2Price: '', totalCapital: '', stake1: '' });
    setSaveData({
      event: '',
      market1Url: '',
      market2Url: '',
      dateEntry: new Date().toISOString().split('T')[0],
      dateExpiry: '',
    });
    setCalcResult(null);
  };

  // Ajouter un arbitrage depuis le dashboard
  const handleAddArbitrage = () => {
    if (!formData.event || !formData.market1Price || !formData.market2Price || !formData.capital) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const p1 = parseFloat(formData.market1Price);
    const p2 = parseFloat(formData.market2Price);
    const capital = parseFloat(formData.capital);

    const optimalScenario = findOptimalScenario(p1, p2);
    if (!optimalScenario) {
      alert('Pas d\'opportunité d\'arbitrage trouvée pour ces prix');
      return;
    }

    const price1 = p1 / 100;
    const price2 = p2 / 100;

    let stake1;
    if (optimalScenario === 1) {
      const cost = price1 + (1 - price2);
      stake1 = capital * (price1 / cost);
    } else {
      const cost = price2 + (1 - price1);
      stake1 = capital * ((1 - price1) / cost);
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
      dateEntry: formData.dateEntry,
      dateExpiry: formData.dateExpiry,
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
    });
  };

  // Supprimer un arbitrage
  const handleDelete = (id) => {
    const updated = arbitrages.filter(a => a.id !== id);
    setArbitrages(updated);
    saveDataToStorage(updated);
  };

  // Calculer les KPIs globaux
  const stats = {
    total: arbitrages.length,
    totalCapital: arbitrages.reduce((sum, a) => sum + a.capital, 0),
    totalProfit: arbitrages.reduce((sum, a) => sum + a.profit, 0),
    avgReturn: arbitrages.length > 0 ? arbitrages.reduce((sum, a) => sum + a.profitPct, 0) / arbitrages.length : 0,
  };

  if (loading) {
    return <div className="p-6 text-center text-white">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔮 Dashboard Arbitrage</h1>
          <p className="text-slate-400">Suivi et optimisation de tes opportunités d'arbitrage</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 ${tab === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
          >
            <TrendingUp size={20} /> Dashboard
          </button>
          <button
            onClick={() => setTab('calculator')}
            className={`px-6 py-3 rounded-lg font-bold transition flex items-center gap-2 ${tab === 'calculator'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
          >
            <Calculator size={20} /> Calculatrice
          </button>
        </div>

        {/* TAB: DASHBOARD */}
        {tab === 'dashboard' && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                <div className="text-slate-400 text-sm mb-1">Arbitrages</div>
                <div className="text-3xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                <div className="text-slate-400 text-sm mb-1">Capital Total</div>
                <div className="text-3xl font-bold text-white">${stats.totalCapital.toFixed(2)}</div>
              </div>
              <div className="bg-emerald-900 rounded-lg p-6 border border-emerald-700">
                <div className="text-emerald-400 text-sm mb-1">Profit Total</div>
                <div className="text-3xl font-bold text-emerald-300">${stats.totalProfit.toFixed(2)}</div>
              </div>
              <div className="bg-blue-900 rounded-lg p-6 border border-blue-700">
                <div className="text-blue-400 text-sm mb-1">Rendement Moyen</div>
                <div className="text-3xl font-bold text-blue-300">{stats.avgReturn.toFixed(2)}%</div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 mb-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Plus size={20} /> Ajouter un arbitrage
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Événement (ex: Fed decision december)"
                  value={formData.event}
                  onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                  className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Date d'entrée en position</label>
                    <input
                      type="date"
                      value={formData.dateEntry}
                      onChange={(e) => setFormData({ ...formData, dateEntry: e.target.value })}
                      className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Date d'échéance du pari</label>
                    <input
                      type="date"
                      value={formData.dateExpiry}
                      onChange={(e) => setFormData({ ...formData, dateExpiry: e.target.value })}
                      className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="url"
                    placeholder="URL Marché 1 (optionnel)"
                    value={formData.market1Url}
                    onChange={(e) => setFormData({ ...formData, market1Url: e.target.value })}
                    className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                  />
                  <input
                    type="url"
                    placeholder="URL Marché 2 (optionnel)"
                    value={formData.market2Url}
                    onChange={(e) => setFormData({ ...formData, market2Url: e.target.value })}
                    className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Prix YES Marché 1 (%)"
                    value={formData.market1Price}
                    onChange={(e) => setFormData({ ...formData, market1Price: e.target.value })}
                    step="0.1"
                    className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Prix YES Marché 2 (%)"
                    value={formData.market2Price}
                    onChange={(e) => setFormData({ ...formData, market2Price: e.target.value })}
                    step="0.1"
                    className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Capital investi ($)"
                    value={formData.capital}
                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                    step="0.01"
                    className="bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleAddArbitrage}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition mt-4"
              >
                Enregistrer l'arbitrage
              </button>
            </div>

            {/* Historique */}
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} /> Historique des arbitrages
              </h2>
              {arbitrages.length === 0 ? (
                <p className="text-slate-400">Aucun arbitrage enregistré pour l'instant</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-3 px-4 text-slate-300">Événement</th>
                        <th className="text-left py-3 px-4 text-slate-300">Entrée</th>
                        <th className="text-left py-3 px-4 text-slate-300">Échéance</th>
                        <th className="text-right py-3 px-4 text-slate-300">Prix M1 / M2</th>
                        <th className="text-right py-3 px-4 text-slate-300">Capital</th>
                        <th className="text-right py-3 px-4 text-slate-300">Profit</th>
                        <th className="text-right py-3 px-4 text-slate-300">Rendement</th>
                        <th className="text-center py-3 px-4 text-slate-300">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arbitrages.map((arb) => (
                        <tr key={arb.id} className="border-b border-slate-600 hover:bg-slate-600 transition">
                          <td className="py-3 px-4 text-white">{arb.event}</td>
                          <td className="py-3 px-4 text-slate-300">{arb.dateEntry}</td>
                          <td className="py-3 px-4 text-slate-300">{arb.dateExpiry}</td>
                          <td className="py-3 px-4 text-right text-slate-300">{arb.market1Price}% / {arb.market2Price}%</td>
                          <td className="py-3 px-4 text-right text-white">${arb.capital.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-bold">${arb.profit.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-blue-300 font-bold">{arb.profitPct.toFixed(2)}%</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDelete(arb.id)}
                              className="text-red-400 hover:text-red-300 transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB: CALCULATOR */}
        {tab === 'calculator' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inputs */}
              <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                <h2 className="text-xl font-bold text-white mb-6">Calculer un arbitrage</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Prix YES Marché 1 (%)</label>
                    <input
                      type="number"
                      value={calcData.market1Price}
                      onChange={(e) => setCalcData({ ...calcData, market1Price: e.target.value })}
                      step="0.1"
                      className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Prix YES Marché 2 (%)</label>
                    <input
                      type="number"
                      value={calcData.market2Price}
                      onChange={(e) => setCalcData({ ...calcData, market2Price: e.target.value })}
                      step="0.1"
                      className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Capital total ($)</label>
                    <input
                      type="number"
                      value={calcData.totalCapital}
                      onChange={(e) => setCalcData({ ...calcData, totalCapital: e.target.value })}
                      step="0.01"
                      className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleCalculate}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition"
                  >
                    Calculer
                  </button>
                </div>

                {/* Résultats */}
                {calcResult && (
                  <div className="mt-8 p-4 bg-slate-600 rounded-lg border border-slate-500">
                    <h3 className="text-lg font-bold text-white mb-4">Résultats de l'allocation sélectionnée</h3>

                    {/* Affichage des mises */}
                    <div className="mb-4 p-3 bg-slate-700 rounded border border-slate-500">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Mise Marché 1:</span>
                          <div className="text-2xl font-bold text-emerald-400">${calcResult.stake1}</div>
                        </div>
                        <div>
                          <span className="text-slate-400">Mise Marché 2:</span>
                          <div className="text-2xl font-bold text-amber-400">${calcResult.stake2}</div>
                        </div>
                      </div>
                    </div>

                    {/* Profits selon les scénarios */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between p-2 bg-slate-700 rounded">
                        <span className="text-slate-300">Si Marché 1 gagne:</span>
                        <span className="text-emerald-400 font-bold">${calcResult.profit1}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-700 rounded">
                        <span className="text-slate-300">Si Marché 2 gagne:</span>
                        <span className="text-amber-400 font-bold">${calcResult.profit2}</span>
                      </div>
                      <div className="border-t border-slate-500 my-2"></div>
                      <div className="flex justify-between p-2 bg-blue-900 rounded border border-blue-700">
                        <span className="text-slate-300">Profit garanti:</span>
                        <span className="text-blue-300 font-bold text-lg">${calcResult.minProfit}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-blue-900 rounded border border-blue-700">
                        <span className="text-slate-300">Rendement garanti:</span>
                        <span className="text-blue-300 font-bold text-lg">{calcResult.profitPct}%</span>
                      </div>
                    </div>

                    {/* Boutons pour privilégier un marché */}
                    <div className="mb-4">
                      <p className="text-slate-300 text-xs mb-2">Privilégier un marché :</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const result = calculateArbitrage(
                              parseFloat(calcData.market1Price),
                              parseFloat(calcData.market2Price),
                              parseFloat(calcData.totalCapital),
                              parseFloat(calcData.totalCapital) * 0.75
                            );
                            setCalcResult(result);
                            setCalcData({ ...calcData, stake1: (parseFloat(calcData.totalCapital) * 0.75).toString() });
                          }}
                          className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded transition"
                        >
                          Marché 1 (75%)
                        </button>
                        <button
                          onClick={() => {
                            const result = calculateArbitrage(
                              parseFloat(calcData.market1Price),
                              parseFloat(calcData.market2Price),
                              parseFloat(calcData.totalCapital),
                              parseFloat(calcData.totalCapital) * 0.5
                            );
                            setCalcResult(result);
                            setCalcData({ ...calcData, stake1: (parseFloat(calcData.totalCapital) * 0.5).toString() });
                          }}
                          className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold py-2 rounded transition"
                        >
                          50/50
                        </button>
                        <button
                          onClick={() => {
                            const result = calculateArbitrage(
                              parseFloat(calcData.market1Price),
                              parseFloat(calcData.market2Price),
                              parseFloat(calcData.totalCapital),
                              parseFloat(calcData.totalCapital) * 0.25
                            );
                            setCalcResult(result);
                            setCalcData({ ...calcData, stake1: (parseFloat(calcData.totalCapital) * 0.25).toString() });
                          }}
                          className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded transition"
                        >
                          Marché 2 (75%)
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowSaveForm(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition"
                    >
                      Enregistrer cette allocation
                    </button>
                  </div>
                )}
              </div>

              {/* Graphique */}
              <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                {calcResult ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-4">Courbe de profit</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart
                        data={calcResult.chartData}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis
                          dataKey="stake1"
                          stroke="#94a3b8"
                          label={{ value: 'Mise Marché 1 ($)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#fff' }}
                          formatter={(value) => value.toFixed(2)}
                          cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="profit1" stroke="#10b981" name="Profit si M1 gagne" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="profit2" stroke="#f59e0b" name="Profit si M2 gagne" strokeWidth={3} dot={false} />
                        <Line
                          type="monotone"
                          dataKey="minProfit"
                          stroke="#3b82f6"
                          name="Profit garanti"
                          strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            const isMax = payload.minProfit === Math.max(...calcResult.chartData.map(d => d.minProfit));
                            if (isMax) {
                              return (
                                <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                              );
                            }
                            return null;
                          }}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-slate-400 text-xs mt-4">
                      💡 Clique sur le graphique pour sélectionner une allocation. Le point 🔴 rouge indique le profit garanti maximal.
                    </p>
                  </>
                ) : (
                  <div className="h-96 flex items-center justify-center">
                    <p className="text-slate-400">Calcule un arbitrage pour voir le graphique</p>
                  </div>
                )}
              </div>
            </div>

            {/* Formulaire d'enregistrement */}
            {showSaveForm && calcResult && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-600 max-w-md w-full">
                  <h2 className="text-2xl font-bold text-white mb-6">Enregistrer l'arbitrage</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-300 text-sm block mb-1">Événement *</label>
                      <input
                        type="text"
                        placeholder="ex: Fed decision december"
                        value={saveData.event}
                        onChange={(e) => setSaveData({ ...saveData, event: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm block mb-1">Date d'entrée en position</label>
                      <input
                        type="date"
                        value={saveData.dateEntry}
                        onChange={(e) => setSaveData({ ...saveData, dateEntry: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm block mb-1">Date d'échéance du pari</label>
                      <input
                        type="date"
                        value={saveData.dateExpiry}
                        onChange={(e) => setSaveData({ ...saveData, dateExpiry: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm block mb-1">URL Marché 1 (optionnel)</label>
                      <input
                        type="url"
                        value={saveData.market1Url}
                        onChange={(e) => setSaveData({ ...saveData, market1Url: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm block mb-1">URL Marché 2 (optionnel)</label>
                      <input
                        type="url"
                        value={saveData.market2Url}
                        onChange={(e) => setSaveData({ ...saveData, market2Url: e.target.value })}
                        className="w-full bg-slate-700 text-white rounded px-4 py-2 border border-slate-500 focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveFromCalc}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setShowSaveForm(false)}
                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded transition"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div >
  );
}
