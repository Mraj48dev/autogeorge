'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Image, ExternalLink } from 'lucide-react';

export default function SiteImagePrompts() {
  const params = useParams();
  const siteId = params.siteId as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prompt Immagini</h1>
        <p className="text-muted-foreground">
          Gestisci i prompt per le immagini di questo sito
        </p>
      </div>

      {/* Temporary Implementation Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Image Prompts Site-Specific
          </CardTitle>
          <CardDescription>
            Gestione prompt immagini per sito specifico in sviluppo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">🚧 Implementazione in Corso</h4>
            <p className="text-blue-700 text-sm mb-4">
              Questa pagina gestirà i prompt delle immagini specificamente per il sito <strong>ID: {siteId}</strong>.
              Per ora, puoi utilizzare la gestione globale.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-blue-600">
                <strong>Prossimi step:</strong>
              </p>
              <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                <li>Filtrare prompt per sito</li>
                <li>Template prompt specifici per sito</li>
                <li>Statistiche generazione immagini per sito</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <a href="/admin/image-prompts" target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                Gestisci Prompt Immagini (Temporaneo)
              </a>
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <strong>Nota:</strong> I prompt immagini dovranno essere associati agli articoli
            di questo sito (ID: {siteId}) per apparire qui una volta completata l'implementazione.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}