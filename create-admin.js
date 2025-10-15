/**
 * Script per creare utente admin
 * Crea amministratore con alessandro.taurino900@gmail.com
 */

async function createAdmin() {
  try {
    console.log('🔧 Creando utente admin...\n');

    // Crea admin via API
    const response = await fetch('https://autogeorge.vercel.app/api/admin/auth/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Claude-Admin-Creator'
      },
      body: JSON.stringify({
        email: 'alessandro.taurino900@gmail.com',
        name: 'Alessandro Taurino',
        userAgent: 'Claude-Admin-Script',
        ipAddress: 'admin-creation',
        role: 'admin'
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Admin creato con successo!');
      console.log('📧 Email:', result.user?.email);
      console.log('👤 Nome:', result.user?.name);
      console.log('🎯 Ruolo:', result.user?.role);
      console.log('🆔 User ID:', result.user?.id);
      console.log('🔑 Permessi:', result.user?.permissions?.length || 0, 'permissions');

      console.log('\n🎉 CREDENZIALI ADMIN:');
      console.log('📧 Email: alessandro.taurino900@gmail.com');
      console.log('🔑 Login: Usa Google/GitHub OAuth o registrati sulla piattaforma');
      console.log('🎯 Ruolo: admin (accesso completo)');

    } else {
      console.log('❌ Errore nella creazione admin:');
      console.log('Status:', response.status);
      console.log('Error:', result.error || result.message);

      if (result.error?.includes('INVALID_EMAIL') || result.error?.includes('already exists')) {
        console.log('\n💡 L\'utente potrebbe già esistere. Promuovo a admin...');

        // Se esiste già, cerca l'utente e promuovilo
        const usersResponse = await fetch('https://autogeorge.vercel.app/api/admin/auth/users');
        const usersResult = await usersResponse.json();

        if (usersResponse.ok && usersResult.users) {
          const existingUser = usersResult.users.find(u => u.email === 'alessandro.taurino900@gmail.com');

          if (existingUser) {
            console.log('👤 Utente trovato:', existingUser.id);

            // Promuovi a admin
            const promoteResponse = await fetch(`https://autogeorge.vercel.app/api/admin/auth/users/${existingUser.id}/role`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'admin' })
            });

            const promoteResult = await promoteResponse.json();

            if (promoteResponse.ok) {
              console.log('✅ Utente promosso ad admin!');
              console.log('🎯 Nuovo ruolo:', promoteResult.user?.role);
            } else {
              console.log('❌ Errore promozione:', promoteResult.error);
            }
          }
        }
      }
    }

    console.log('\n🔗 ACCEDI ALLA PIATTAFORMA:');
    console.log('🌐 Homepage: https://autogeorge.vercel.app/');
    console.log('🔐 Login: https://autogeorge.vercel.app/auth/signin');
    console.log('📊 Admin: https://autogeorge.vercel.app/admin');

  } catch (error) {
    console.error('❌ Errore script:', error.message);
  }
}

createAdmin();