'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface SiteStats {
  sources: number;
  articles: number;
  images: number;
  prompts: number;
  lastUpdate: string;
}

export default function SiteMonitor() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [stats, setStats] = useState<SiteStats>({
    sources: 0,
    articles: 0,
    images: 0,
    prompts: 0,
    lastUpdate: new Date().toLocaleString('it-IT')
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data - replace with real API calls later
    const loadStats = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      // Placeholder data - replace with real data later
      setStats({
        sources: Math.floor(Math.random() * 10) + 1,
        articles: Math.floor(Math.random() * 50) + 5,
        images: Math.floor(Math.random() * 30) + 2,
        prompts: Math.floor(Math.random() * 20) + 3,
        lastUpdate: new Date().toLocaleString('it-IT')
      });

      setLoading(false);
    };

    loadStats();
  }, [siteId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Sources Configurate',
      value: stats.sources,
      subtitle: 'Feed RSS attivi',
      icon: '📡',
      color: 'bg-blue-500'
    },
    {
      title: 'Articoli Generati',
      value: stats.articles,
      subtitle: 'Contenuti creati',
      icon: '📄',
      color: 'bg-green-500'
    },
    {
      title: 'Immagini Generate',
      value: stats.images,
      subtitle: 'Asset visuali',
      icon: '🖼️',
      color: 'bg-purple-500'
    },
    {
      title: 'Prompt Utilizzati',
      value: stats.prompts,
      subtitle: 'Template AI',
      icon: '🤖',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Monitor Sito</h1>
        <p className="text-gray-600">Panoramica completa delle attività e statistiche del sito</p>
        <p className="text-sm text-gray-500 mt-2">Ultimo aggiornamento: {stats.lastUpdate}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                  {card.icon}
                </div>
              </div>
            </div>
            <div className={`h-2 ${card.color}`}></div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Attività Recente</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { action: 'Nuovo articolo generato', time: '2 ore fa', icon: '📄', color: 'text-green-600' },
                { action: 'Source RSS aggiornata', time: '4 ore fa', icon: '📡', color: 'text-blue-600' },
                { action: 'Immagine generata', time: '6 ore fa', icon: '🖼️', color: 'text-purple-600' },
                { action: 'Prompt personalizzato creato', time: '1 giorno fa', icon: '🤖', color: 'text-orange-600' },
                { action: 'Articolo pubblicato', time: '2 giorni fa', icon: '✅', color: 'text-green-600' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className={`text-xl ${activity.color}`}>{activity.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Statistiche Rapide</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Articoli questa settimana</span>
                <span className="text-lg font-semibold text-gray-900">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Media articoli/giorno</span>
                <span className="text-lg font-semibold text-gray-900">1.7</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tempo medio generazione</span>
                <span className="text-lg font-semibold text-gray-900">45s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Successo pubblicazione</span>
                <span className="text-lg font-semibold text-green-600">98%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sources attive</span>
                <span className="text-lg font-semibold text-blue-600">{stats.sources}/{stats.sources}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Performance nel Tempo</h2>
        </div>
        <div className="p-6">
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-lg font-medium">Grafico Performance</p>
              <p className="text-sm">Sarà implementato nella prossima versione</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}