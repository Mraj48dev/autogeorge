'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  type: 'REQUEST' | 'SUCCESS' | 'ERROR';
  message: string;
  details?: any;
}

export default function RSSMonitorDebug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const addLog = (type: LogEntry['type'], message: string, details?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };

    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
    setLastUpdate(new Date().toLocaleTimeString());
  };

  const pollFeeds = async () => {
    addLog('REQUEST', 'Iniziando polling dei feed RSS...');

    try {
      const response = await fetch('/api/cron/poll-feeds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addLog('SUCCESS', `Polling completato con successo`, {
          totalSources: data.results.totalSources,
          successfulPolls: data.results.successfulPolls,
          failedPolls: data.results.failedPolls,
          newItemsFound: data.results.newItemsFound,
          duplicatesSkipped: data.results.duplicatesSkipped,
          duration: data.results.duration
        });
      } else {
        addLog('ERROR', `Polling fallito: ${data.error || response.statusText}`, data);
      }
    } catch (error) {
      addLog('ERROR', `Errore di rete: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      // Start immediately
      pollFeeds();

      // Then every minute
      interval = setInterval(pollFeeds, 60000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'REQUEST': return 'text-blue-600 bg-blue-50';
      case 'SUCCESS': return 'text-green-600 bg-green-50';
      case 'ERROR': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'REQUEST': return '🔄';
      case 'SUCCESS': return '✅';
      case 'ERROR': return '❌';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔍 RSS Monitor Debug Dashboard
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
            </button>

            <button
              onClick={pollFeeds}
              disabled={isMonitoring}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              🔄 Poll Now
            </button>

            <button
              onClick={() => setLogs([])}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              🗑️ Clear Logs
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Status</h3>
              <p className="text-2xl font-bold text-blue-600">
                {isMonitoring ? '🟢 ACTIVE' : '🔴 STOPPED'}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Total Logs</h3>
              <p className="text-2xl font-bold text-green-600">{logs.length}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Last Update</h3>
              <p className="text-lg font-bold text-purple-600">{lastUpdate || 'Never'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 Live Logs (Auto-refresh ogni minuto)
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">🕐 Nessun log ancora...</p>
                <p className="text-sm">Clicca "Start Monitoring" per iniziare</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${getLogColor(log.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getLogIcon(log.type)}</span>
                      <div>
                        <p className="font-semibold">{log.message}</p>
                        <p className="text-sm opacity-70">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getLogColor(log.type)}`}>
                      {log.type}
                    </span>
                  </div>

                  {log.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium opacity-70 hover:opacity-100">
                        📊 Dettagli
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">💡 Come usare questo debug:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Start Monitoring</strong>: Avvia il polling automatico ogni 60 secondi</li>
            <li>• <strong>Poll Now</strong>: Esegui un test immediato del sistema RSS</li>
            <li>• <strong>Osserva i logs</strong>: Ogni richiesta mostrerà REQUEST → SUCCESS/ERROR</li>
            <li>• <strong>Controlla i dettagli</strong>: Clicca "Dettagli" per vedere risultati completi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}