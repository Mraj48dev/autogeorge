'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const USER_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin', color: 'bg-purple-100 text-purple-800' },
  { value: 'CONTENT_MANAGER', label: 'Content Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONTENT_EDITOR', label: 'Content Editor', color: 'bg-green-100 text-green-800' },
  { value: 'CONTENT_VIEWER', label: 'Content Viewer', color: 'bg-gray-100 text-gray-800' },
  { value: 'API_USER', label: 'API User', color: 'bg-yellow-100 text-yellow-800' }
];

export default function UsersAdminPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      } else {
        throw new Error(data.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (user: User) => {
    const newRole = prompt(`Modifica ruolo per ${user.email}:`, user.role);
    if (newRole && newRole !== user.role) {
      try {
        const response = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole, isActive: user.isActive })
        });

        if (response.ok) {
          alert('Utente aggiornato con successo!');
          fetchUsers(); // Refresh the list
        } else {
          alert('Errore durante l\'aggiornamento');
        }
      } catch (error) {
        alert('Errore durante l\'aggiornamento');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Sei sicuro di voler modificare lo stato di questo utente?')) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          alert('Stato utente modificato!');
          fetchUsers(); // Refresh the list
        } else {
          alert('Errore durante la modifica');
        }
      } catch (error) {
        alert('Errore durante la modifica');
      }
    }
  };

  useEffect(() => {
    // Only fetch users if authenticated
    if (isLoaded && isSignedIn) {
      fetchUsers();
    }
  }, [isLoaded, isSignedIn]);

  // Render loading state
  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  // Render auth required state
  if (!isSignedIn) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Accesso Richiesto</h2>
        <p>Devi essere autenticato per accedere a questa pagina.</p>
      </div>
    </div>;
  }

  const getRoleInfo = (role: string) => {
    return USER_ROLES.find(r => r.value === role) || {
      value: role,
      label: role,
      color: 'bg-gray-100 text-gray-800'
    };
  };

  return (
    <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Utenti</h1>
          <p className="text-gray-600">
            Gestisci gli utenti del sistema, i loro ruoli e permessi.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Errore</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">Lista Utenti</h2>
              <p className="text-sm text-gray-500">Un elenco di tutti gli utenti nel sistema.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-gray-600">Caricamento utenti...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun utente</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Non ci sono utenti nel sistema.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ruolo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => {
                      const roleInfo = getRoleInfo(user.role);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {user.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.email}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {user.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleInfo.color}`}>
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Attivo' : 'Inattivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('it-IT')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs"
                              >
                                Modifica
                              </button>
                              {user.email !== 'mraj48bis@gmail.com' && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs"
                                >
                                  {user.isActive ? 'Disattiva' : 'Attiva'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Sistema User Management</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Il sistema di gestione utenti è stato implementato.
                    Le funzionalità complete (creazione, modifica ruoli, inviti)
                    saranno disponibili dopo l'integrazione con il sistema di autorizzazione esistente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}