export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'blue', fontSize: '24px' }}>Test Page - Simple Layout</h1>
      <p style={{ color: 'black', fontSize: '16px', marginTop: '20px' }}>
        Questa è una pagina di test semplice per verificare che il rendering di base funzioni.
      </p>
      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '20px',
        marginTop: '20px',
        border: '1px solid #ccc'
      }}>
        <h2>Test CSS Inline</h2>
        <p>Se vedi questo contenuto correttamente stilizzato, il problema è con Tailwind CSS.</p>
      </div>

      <div className="bg-blue-500 text-white p-4 mt-4 rounded">
        <h2>Test Tailwind CSS</h2>
        <p>Se vedi questo blocco blu con testo bianco, Tailwind CSS funziona correttamente.</p>
      </div>
    </div>
  );
}