import { useState, useEffect } from 'react';
import adminApi from '@/api/adminApiClient';
import { Loader2, UserPlus, Search, Pencil, Trash2, Eye, EyeOff, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [authMethodFilter, setAuthMethodFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user',
    useEmailAuth: true,
    useGoogleAuth: false,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchEmail) params.search = searchEmail;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (authMethodFilter !== 'all') params.auth_method = authMethodFilter;
      const res = await adminApi.users.list(params);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchEmail, roleFilter, authMethodFilter]);

  const resetNewUser = () => {
    setNewUser({ email: '', password: '', role: 'user', useEmailAuth: true, useGoogleAuth: false });
    setShowPassword(false);
  };

  const handleAuthMethodChange = (method) => {
    if (method === 'email') {
      setNewUser({ ...newUser, useEmailAuth: true, useGoogleAuth: false });
    } else {
      setNewUser({ ...newUser, useEmailAuth: false, useGoogleAuth: true, password: '' });
    }
  };

  const handleAddUser = async () => {
    const userData = {
      email: newUser.email,
      role: newUser.role,
      auth_method: newUser.useEmailAuth ? 'email' : 'google',
    };
    if (newUser.useEmailAuth) userData.password = newUser.password;

    setSaving(true);
    try {
      await adminApi.users.create(userData);
      setIsAddDialogOpen(false);
      resetNewUser();
      fetchUsers();
      alert('User created successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    const hasSubscription = selectedUser.is_subscribed;
    const hasPlan = selectedUser.subscription_plan && selectedUser.subscription_plan !== 'none';
    const hasEndDate = selectedUser.subscription_end_date;

    if (hasSubscription && (!hasPlan || !hasEndDate)) {
      alert('When marking subscription as active, you must also set Plan and Expiration Date.');
      return;
    }
    if ((hasPlan || hasEndDate) && !hasSubscription) {
      alert('When setting Plan or Expiration Date, you must also mark subscription as active.');
      return;
    }

    const updates = {
      email: selectedUser.email,
      full_name: selectedUser.full_name,
      role: selectedUser.role,
      is_subscribed: selectedUser.is_subscribed,
      subscription_plan: selectedUser.subscription_plan === 'none' ? null : selectedUser.subscription_plan,
      subscription_end_date: selectedUser.subscription_end_date,
      subscription_price: selectedUser.subscription_price,
    };

    if (!selectedUser.oauth_provider && editPassword && editPassword === editPasswordConfirm) {
      updates.password = editPassword;
    }

    setSaving(true);
    try {
      await adminApi.users.update(selectedUser.id, updates);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      alert('User updated successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.email}"? This cannot be undone.`)) return;
    try {
      await adminApi.users.remove(user.id);
      fetchUsers();
      alert('User deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser({ ...user });
    setEditPassword('');
    setEditPasswordConfirm('');
    setShowEditPassword(false);
    setIsEditDialogOpen(true);
  };

  return (
    <div>
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <p className="text-muted-foreground text-sm">Manage user accounts, roles, and authentication methods</p>
      </div>

      <div className="p-6">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter by role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={authMethodFilter} onValueChange={setAuthMethodFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter by auth" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-medium">Auth</th>
                      <th className="text-left py-3 px-4 text-xs font-medium">Role</th>
                      <th className="text-left py-3 px-4 text-xs font-medium">Subscription</th>
                      <th className="text-left py-3 px-4 text-xs font-medium">Expires</th>
                      <th className="text-right py-3 px-4 text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isSubscribed = user.is_subscribed && user.subscription_end_date && new Date(user.subscription_end_date) > new Date();
                      return (
                        <tr key={user.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">
                              {user.oauth_provider ? user.oauth_provider : 'Email'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                              {isSubscribed ? `Active${user.subscription_plan ? ` (${user.subscription_plan})` : ''}` : 'None'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString() : '--'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)} title="Edit">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} title="Delete" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="user@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={newUser.useEmailAuth} onCheckedChange={() => handleAuthMethodChange('email')} />
                  <Label className="font-normal cursor-pointer">Email/Password</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox checked={newUser.useGoogleAuth} onCheckedChange={() => handleAuthMethodChange('google')} />
                  <Label className="font-normal cursor-pointer">Google</Label>
                </div>
              </div>
            </div>
            {newUser.useEmailAuth && (
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetNewUser(); }}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={!newUser.email || (newUser.useEmailAuth && !newUser.password) || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and subscription</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">Basic Information</h3>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={selectedUser.email || ''} onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={selectedUser.full_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auth Method</Label>
                  <Badge variant="outline">
                    {selectedUser.oauth_provider ? selectedUser.oauth_provider : 'Email/Password'}
                  </Badge>
                </div>
              </div>

              {/* Password */}
              {!selectedUser.oauth_provider && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">Password Management</h3>
                  <p className="text-sm text-muted-foreground">Leave blank to keep current password</p>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input type={showEditPassword ? 'text' : 'password'} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Enter new password (optional)" />
                      <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {editPassword && (
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type={showEditPassword ? 'text' : 'password'} value={editPasswordConfirm} onChange={(e) => setEditPasswordConfirm(e.target.value)} placeholder="Confirm new password" />
                      {editPassword !== editPasswordConfirm && editPasswordConfirm && (
                        <p className="text-xs text-red-600">Passwords do not match</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subscription */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">Subscription Management</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox checked={selectedUser.is_subscribed || false} onCheckedChange={(checked) => setSelectedUser({ ...selectedUser, is_subscribed: checked })} />
                  <Label className="font-normal cursor-pointer">Active Subscription</Label>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Input value={selectedUser.subscription_plan || ''} onChange={(e) => setSelectedUser({ ...selectedUser, subscription_plan: e.target.value || null })} placeholder="e.g., monthly, annual" />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input type="date" value={selectedUser.subscription_end_date ? new Date(selectedUser.subscription_end_date).toISOString().split('T')[0] : ''} onChange={(e) => setSelectedUser({ ...selectedUser, subscription_end_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Price (optional)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={selectedUser.subscription_price || ''} onChange={(e) => setSelectedUser({ ...selectedUser, subscription_price: e.target.value })} />
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">Account Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Created At</Label>
                    <p className="mt-1">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '--'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Login</Label>
                    <p className="mt-1">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : '--'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">User ID</Label>
                    <p className="mt-1 font-mono text-xs">{selectedUser.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={saving || (editPassword && editPassword !== editPasswordConfirm)}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
