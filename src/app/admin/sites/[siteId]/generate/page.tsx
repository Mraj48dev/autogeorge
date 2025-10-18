'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Plus, ExternalLink } from 'lucide-react';

export default function SiteGenerate() {
  const params = useParams();
  const siteId = params.siteId as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Genera Articolo</h1>
        <p className="text-muted-foreground">
          Crea nuovo contenuto per questo sito
        </p>
      </div>

      {/* Temporary Implementation Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generazione Site-Specific
          </CardTitle>
          <CardDescription>
            Generazione articoli per sito specifico in sviluppo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">🚧 Implementazione in Corso</h4>
            <p className="text-blue-700 text-sm mb-4">
              Questa pagina genererà articoli specificamente per il sito <strong>ID: {siteId}</strong>.
              Per ora, puoi utilizzare la generazione globale.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-blue-600">
                <strong>Prossimi step:</strong>
              </p>
              <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                <li>Pre-compilare wordpressSiteId nel form</li>
                <li>Usare impostazioni specifiche del sito</li>
                <li>Pubblicazione diretta su questo sito</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <a href="/admin/generate" target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                Genera Articolo (Temporaneo)
              </a>
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <strong>Nota:</strong> Assicurati di selezionare questo sito (ID: {siteId})
            nel form di generazione per associarlo correttamente.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}