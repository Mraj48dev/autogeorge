'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, CheckCircle, XCircle, Play, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MonitorRecord {
  id: string;
  feedItemId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  priority: 'high' | 'normal' | 'low';
  articleId?: string;
  generatedAt?: string;
  error?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  source: {
    id: string;
    name: string;
    type: string;
    url?: string;
    configuration: any;
  };
  feedItem: {
    id: string;
    guid?: string;
    fetchedAt: string;
    processed: boolean;
  };
}

interface MonitorData {
  monitors: MonitorRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export default function MonitorGenerationPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Carica i dati
  const loadData = async (status = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/monitor-generation?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Genera articolo da un monitor record
  const generateArticle = async (monitorId: string) => {
    try {
      setGeneratingIds(prev => new Set([...prev, monitorId]));

      const response = await fetch(`/api/admin/monitor-generation/${monitorId}/generate`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Ricarica i dati per mostrare l'aggiornamento
      await loadData(selectedStatus);

      console.log('✅ Article generated successfully:', result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate article');
    } finally {
      setGeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(monitorId);
        return newSet;
      });
    }
  };

  // Pulizia record completati/falliti
  const cleanupRecords = async (status: string, days: number = 7) => {
    try {
      const response = await fetch(`/api/admin/monitor-generation?status=${status}&days=${days}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      console.log(`🗑️ Cleaned up ${result.data.deleted} records`);
      await loadData(selectedStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup records');
    }
  };

  // Effetto per caricare i dati iniziali
  useEffect(() => {
    loadData(selectedStatus);
  }, [selectedStatus]);

  // Status colors e icons
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading monitor generation records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitor Generation</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci la coda di generazione articoli automatica
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadData(selectedStatus)}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => cleanupRecords('completed')}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Cleanup Completed
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.byStatus['pending'] || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.stats.byStatus['completed'] || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.stats.byStatus['error'] || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs per Status */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="error">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : data && data.monitors.length > 0 ? (
            <div className="grid gap-4">
              {data.monitors.map((monitor) => (
                <Card key={monitor.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(monitor.status)}
                          {getPriorityBadge(monitor.priority)}
                          <Badge variant="outline">{monitor.source.name}</Badge>
                        </div>
                        <CardTitle className="text-lg">{monitor.title}</CardTitle>
                        <CardDescription>
                          {monitor.content.substring(0, 200)}
                          {monitor.content.length > 200 && '...'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2">
                        {monitor.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => generateArticle(monitor.id)}
                            disabled={generatingIds.has(monitor.id)}
                          >
                            {generatingIds.has(monitor.id) ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-1" />
                            )}
                            Generate
                          </Button>
                        )}
                        {monitor.articleId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/admin/articles/${monitor.articleId}`, '_blank')}
                          >
                            View Article
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Created: {new Date(monitor.createdAt).toLocaleString()}</span>
                        <span>Published: {new Date(monitor.publishedAt).toLocaleString()}</span>
                      </div>
                      {monitor.generatedAt && (
                        <div>Generated: {new Date(monitor.generatedAt).toLocaleString()}</div>
                      )}
                      {monitor.error && (
                        <div className="text-red-600 font-mono text-xs bg-red-50 p-2 rounded">
                          {monitor.error}
                        </div>
                      )}
                      {monitor.url && (
                        <div>
                          <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Original URL
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-32">
                <Clock className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No monitor generation records found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}