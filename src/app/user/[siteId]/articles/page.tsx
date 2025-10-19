export default function Articles() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Articoli</h1>
        <p className="text-gray-600">Visualizza e gestisci tutti i tuoi articoli generati</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Lista Articoli</h2>
          <p className="text-gray-600 mb-4">Funzionalità in arrivo nella prossima versione</p>
          <div className="text-sm text-gray-500">
            Qui potrai visualizzare, modificare e gestire tutti i tuoi articoli
          </div>
        </div>
      </div>
    </div>
  );
}