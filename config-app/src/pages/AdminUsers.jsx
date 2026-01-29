import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, Plus, Trash2, UserCog, Shield, Power } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminUsers() {
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    full_name: '',
    auth_method: 'google',
    password: '',
  });

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.adminUsers.list();
      setAdminUsers(res.data);
    } catch (err) {
      console.error('Failed to load admin users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const resetForm = () => {
    setNewAdmin({ email: '', full_name: '', auth_method: 'google', password: '' });
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.email.trim()) {
      alert('Please enter an email address.');
      return;
    }
    if (newAdmin.auth_method === 'password' && !newAdmin.password.trim()) {
      alert('Please enter a password for password-based authentication.');
      return;
    }

    const data = {
      email: newAdmin.email.trim(),
      full_name: newAdmin.full_name.trim(),
      auth_method: newAdmin.auth_method,
    };
    if (newAdmin.auth_method === 'password') {
      data.password = newAdmin.password;
    }

    setSaving(true);
    try {
      await adminApi.adminUsers.create(data);
      setIsAddDialogOpen(false);
      resetForm();
      fetchAdminUsers();
      alert('Admin user added successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add admin user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin) => {
    try {
      await adminApi.adminUsers.update(admin.id, {
        ...admin,
        is_active: !admin.is_active,
      });
      fetchAdminUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update admin status');
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!window.confirm(`Are you sure you want to delete admin "${admin.email}"? This cannot be undone.`)) return;
    try {
      await adminApi.adminUsers.remove(admin.id);
      fetchAdminUsers();
      alert('Admin user deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete admin user');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <p className="text-muted-foreground text-sm">Manage administrator accounts for the config app</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            <strong>{adminUsers.filter((a) => a.is_active !== false).length}</strong> active admin{adminUsers.filter((a) => a.is_active !== false).length !== 1 ? 's' : ''}
          </p>
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>

        {/* Admin Users Table */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading admin users...</p>
          </Card>
        ) : adminUsers.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No admin users</h3>
            <p className="text-muted-foreground">Add your first admin user to get started</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Auth Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Created By</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adminUsers.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium">{admin.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">{admin.full_name || '--'}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {admin.auth_method || 'google'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={admin.is_active !== false}
                            onCheckedChange={() => handleToggleActive(admin)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {admin.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(admin.last_login)}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(admin.created_at)}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{admin.created_by || '--'}</td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin)}
                          className="text-red-600"
                          title="Delete Admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>Add a new administrator to the config app</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={newAdmin.full_name}
                onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <Select value={newAdmin.auth_method} onValueChange={(value) => setNewAdmin({ ...newAdmin, auth_method: value, password: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google OAuth</SelectItem>
                  <SelectItem value="password">Email/Password</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newAdmin.auth_method === 'google'
                  ? 'User will sign in via Google. The email must match their Google account.'
                  : 'User will sign in with email and password.'}
              </p>
            </div>
            {newAdmin.auth_method === 'password' && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleAddAdmin}
              disabled={!newAdmin.email || (newAdmin.auth_method === 'password' && !newAdmin.password) || saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
