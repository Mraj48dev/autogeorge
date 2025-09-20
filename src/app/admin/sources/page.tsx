'use client';

import { useState } from 'react';

export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState('rss');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Gestione Sources
        </h1>
        <p className="text-gray-600">
          Configura le fonti di contenuto per la generazione automatica
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rss')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rss'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Feed RSS
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'telegram'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Telegram
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calendario Editoriale
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rss' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Feed RSS</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Aggiungi Feed
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun feed RSS configurato</h4>
            <p className="text-gray-600 mb-6">
              Aggiungi feed RSS per generare automaticamente articoli dai contenuti delle tue fonti preferite
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Configura primo feed
            </button>
          </div>
        </div>
      )}

      {activeTab === 'telegram' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Canali Telegram</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Aggiungi Canale
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun canale Telegram connesso</h4>
            <p className="text-gray-600 mb-6">
              Collega canali Telegram per monitorare contenuti e generare articoli dai post più interessanti
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Connetti primo canale
            </button>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Calendario Editoriale</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              + Programma Articolo
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Calendario vuoto</h4>
            <p className="text-gray-600 mb-6">
              Programma la generazione automatica di articoli in date specifiche con argomenti predefiniti
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Programma primo articolo
            </button>
          </div>
        </div>
      )}

      {/* Quick Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-blue-900">Feed RSS</h3>
          </div>
          <p className="text-blue-700 mb-4">
            Monitora automaticamente blog e siti web per nuovi contenuti
          </p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            Configura RSS →
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-green-900">Telegram</h3>
          </div>
          <p className="text-green-700 mb-4">
            Integra canali Telegram per contenuti real-time e trend
          </p>
          <button className="text-green-600 hover:text-green-800 font-medium">
            Connetti Telegram →
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-purple-900">Calendario</h3>
          </div>
          <p className="text-purple-700 mb-4">
            Pianifica contenuti con date e argomenti predefiniti
          </p>
          <button className="text-purple-600 hover:text-purple-800 font-medium">
            Pianifica Contenuti →
          </button>
        </div>
      </div>
    </div>
  );
}