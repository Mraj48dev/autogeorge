'use client';

import { useState, useEffect } from 'react';
import { UsersManagerGuard } from '@/shared/components/auth/AuthGuard';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
}

interface UsersResponse {
  success: boolean;
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const USER_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { value: 'ORGANIZATION_ADMIN', label: 'Organization Admin', color: 'bg-orange-100 text-orange-800' },
  { value: 'CONTENT_MANAGER', label: 'Content Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONTENT_EDITOR', label: 'Content Editor', color: 'bg-green-100 text-green-800' },
  { value: 'CONTENT_VIEWER', label: 'Content Viewer', color: 'bg-gray-100 text-gray-800' },
  { value: 'API_USER', label: 'API User', color: 'bg-purple-100 text-purple-800' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('CONTENT_VIEWER');
  const [bulkRole, setBulkRole] = useState('CONTENT_VIEWER');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CONTENT_VIEWER');
  const [inviteMessage, setInviteMessage] = useState('');

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?page=${page}&limit=20`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: UsersResponse = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          role: newUserRole,
          createExternalUser: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setNewUserEmail('');
        setNewUserRole('CONTENT_VIEWER');
        await fetchUsers(pagination.page);
        alert(`User ${newUserEmail} created successfully!`);
      }
    } catch (err) {
      alert(`Error creating user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign role');
      }

      const data = await response.json();

      if (data.success) {
        await fetchUsers(pagination.page);
        alert(`Role ${role} assigned successfully!`);
      }
    } catch (err) {
      alert(`Error assigning role: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const bulkAssignRole = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/users/bulk-assign-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          role: bulkRole
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk assign role');
      }

      const data = await response.json();

      if (data.success) {
        setShowRoleModal(false);
        setSelectedUsers([]);
        setBulkRole('CONTENT_VIEWER');
        await fetchUsers(pagination.page);
        alert(`Bulk role assignment completed: ${data.summary.successful} successful, ${data.summary.failed} failed`);
      }
    } catch (err) {
      alert(`Error bulk assigning role: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const data = await response.json();

      if (data.success) {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('CONTENT_VIEWER');
        setInviteMessage('');
        alert(`Invito inviato a ${inviteEmail} con successo!\nLink di invito: ${data.invitation.invitationLink}`);
      }
    } catch (err) {
      alert(`Errore nell'invio dell'invito: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleInfo = (role: string) => {
    return USER_ROLES.find(r => r.value === role) || {
      value: role,
      label: role,
      color: 'bg-gray-100 text-gray-800'
    };
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <UsersManagerGuard>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Gestione Utenti
              </h1>
              <p className="text-gray-600">
                Gestisci utenti, ruoli e permessi del sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowInviteModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Invita Utente
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Crea Utente
              </Button>
              {selectedUsers.length > 0 && (
                <Button
                  onClick={() => setShowRoleModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Assegna Ruolo ({selectedUsers.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Utenti ({pagination.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Caricamento utenti...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Nessun utente trovato</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(users.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Ruolo</th>
                      <th className="text-left p-2">Stato</th>
                      <th className="text-left p-2">Creato</th>
                      <th className="text-left p-2">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const roleInfo = getRoleInfo(user.role);
                      return (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                            />
                          </td>
                          <td className="p-2 font-medium">{user.email}</td>
                          <td className="p-2">
                            <Badge className={roleInfo.color}>
                              {roleInfo.label}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {user.isActive ? 'Attivo' : 'Inattivo'}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <select
                              value={user.role}
                              onChange={(e) => assignRole(user.id, e.target.value)}
                              className="text-sm border rounded px-2 py-1"
                            >
                              {USER_ROLES.map(role => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-600">
                  Pagina {pagination.page} di {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    variant="outline"
                    size="sm"
                  >
                    Precedente
                  </Button>
                  <Button
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    variant="outline"
                    size="sm"
                  >
                    Successiva
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Crea Nuovo Utente</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="utente@esempio.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ruolo</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                >
                  Annulla
                </Button>
                <Button
                  onClick={createUser}
                  disabled={!newUserEmail || loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Creando...' : 'Crea Utente'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Role Assignment Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                Assegna Ruolo a {selectedUsers.length} Utenti
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nuovo Ruolo</label>
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={() => setShowRoleModal(false)}
                  variant="outline"
                >
                  Annulla
                </Button>
                <Button
                  onClick={bulkAssignRole}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Assegnando...' : 'Assegna Ruolo'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Invita Nuovo Utente</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="utente@esempio.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ruolo</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    {USER_ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Messaggio (opzionale)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Benvenuto nel team! Siamo felici di averti con noi."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={() => setShowInviteModal(false)}
                  variant="outline"
                >
                  Annulla
                </Button>
                <Button
                  onClick={inviteUser}
                  disabled={!inviteEmail || loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? 'Inviando...' : 'Invia Invito'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UsersManagerGuard>
  );
}