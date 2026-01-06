import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus, Search, Pencil, Trash2, Eye, EyeOff, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { NotificationPopup } from '../components/ui/notification';
import { Badge } from '../components/ui/badge';
import api from '../api/apiClient';

export default function SettingsUsers() {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });

  const showNotification = (message, title = "", type = "success") => {
    setNotification({ open: true, title, message, type });
  };
  const [searchEmail, setSearchEmail] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [authMethodFilter, setAuthMethodFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user',
    useEmailAuth: true,
    useGoogleAuth: false
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', searchEmail, roleFilter, authMethodFilter],
    queryFn: async () => {
      const params = {};
      if (searchEmail) params.search = searchEmail;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (authMethodFilter !== 'all') params.auth_method = authMethodFilter;
      return api.entities.Users.list(params);
    }
  });

  const createUserMutation = useMutation({
    mutationFn: (userData) => api.entities.Users.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsAddDialogOpen(false);
      resetNewUser();
      showNotification('User created successfully', 'Success', 'success');
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to create user',
        type: 'error'
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }) => api.entities.Users.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      showNotification('User updated successfully', 'Success', 'success');
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to update user',
        type: 'error'
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.entities.Users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      showNotification('User deleted successfully', 'Success', 'success');
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to delete user',
        type: 'error'
      });
    }
  });

  const resetNewUser = () => {
    setNewUser({
      email: '',
      password: '',
      role: 'user',
      useEmailAuth: true,
      useGoogleAuth: false
    });
    setShowPassword(false);
  };

  const handleAddUser = () => {
    const userData = {
      email: newUser.email,
      role: newUser.role,
      auth_method: newUser.useEmailAuth ? 'email' : 'google'
    };

    if (newUser.useEmailAuth) {
      userData.password = newUser.password;
    }

    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = () => {
    const updates = {
      email: selectedUser.email,
      full_name: selectedUser.full_name,
      role: selectedUser.role,
      is_subscribed: selectedUser.is_subscribed,
      subscription_plan: selectedUser.subscription_plan,
      subscription_end_date: selectedUser.subscription_end_date,
      subscription_price: selectedUser.subscription_price
    };

    // Add password if provided and user is email auth
    if (!selectedUser.oauth_provider && editPassword && editPassword === editPasswordConfirm) {
      updates.password = editPassword;
    }

    updateUserMutation.mutate({ id: selectedUser.id, updates });
  };

  const handleDeleteUser = () => {
    deleteUserMutation.mutate(selectedUser.id);
  };

  const openEditDialog = (user) => {
    setSelectedUser({ ...user });
    setEditPassword('');
    setEditPasswordConfirm('');
    setShowEditPassword(false);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleAuthMethodChange = (method) => {
    if (method === 'email') {
      setNewUser({ ...newUser, useEmailAuth: true, useGoogleAuth: false });
    } else {
      setNewUser({ ...newUser, useEmailAuth: false, useGoogleAuth: true, password: '' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Users Management</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and authentication methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={authMethodFilter} onValueChange={setAuthMethodFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by auth" />
              </SelectTrigger>
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

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Auth Method</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Subscription</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Expires</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSubscribed = user.is_subscribed && user.subscription_end_date && new Date(user.subscription_end_date) > new Date();
                    return (
                    <tr key={user.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-sm">{user.email}</td>
                      <td className="py-3 px-4">
                        {user.oauth_provider ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            {user.oauth_provider === 'google' ? 'Google' : user.oauth_provider}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                            <Mail className="w-3 h-3 mr-1" />
                            Email
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : ''}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isSubscribed ? 'default' : 'secondary'} className={isSubscribed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}>
                          {isSubscribed ? `Active${user.subscription_plan ? ` (${user.subscription_plan})` : ''}` : 'None'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)}>
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
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with email or Google authentication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="user@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="email-auth" checked={newUser.useEmailAuth} onCheckedChange={() => handleAuthMethodChange('email')} />
                  <Label htmlFor="email-auth" className="font-normal cursor-pointer">Email/Password</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="google-auth" checked={newUser.useGoogleAuth} onCheckedChange={() => handleAuthMethodChange('google')} />
                  <Label htmlFor="google-auth" className="font-normal cursor-pointer">Google</Label>
                </div>
              </div>
            </div>
            {newUser.useEmailAuth && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetNewUser(); }}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={!newUser.email || (newUser.useEmailAuth && !newUser.password) || createUserMutation.isPending}>
              {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information, subscription, and settings</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b pb-2">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" value={selectedUser.email || ''} onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-full-name">Full Name</Label>
                  <Input id="edit-full-name" type="text" value={selectedUser.full_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}>
                    <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auth Method</Label>
                  <div>
                    {selectedUser.oauth_provider ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {selectedUser.oauth_provider === 'google' ? 'Google' : selectedUser.oauth_provider}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Mail className="w-3 h-3 mr-1" />
                        Email/Password
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Password Management (Email users only) */}
              {!selectedUser.oauth_provider && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b pb-2">Password Management</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Set a new password for this user (leave blank to keep current password)</p>
                  <div className="space-y-2">
                    <Label htmlFor="edit-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="edit-password"
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter new password (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {editPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-password-confirm">Confirm New Password</Label>
                      <Input
                        id="edit-password-confirm"
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPasswordConfirm}
                        onChange={(e) => setEditPasswordConfirm(e.target.value)}
                        placeholder="Confirm new password"
                      />
                      {editPassword !== editPasswordConfirm && editPasswordConfirm && (
                        <p className="text-xs text-red-600">Passwords do not match</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Subscription Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b pb-2">Subscription Management</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-is-subscribed"
                    checked={selectedUser.is_subscribed || false}
                    onCheckedChange={(checked) => setSelectedUser({ ...selectedUser, is_subscribed: checked })}
                  />
                  <Label htmlFor="edit-is-subscribed" className="font-normal cursor-pointer">Active Subscription</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subscription-plan">Subscription Plan</Label>
                  <Select
                    value={selectedUser.subscription_plan || 'none'}
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, subscription_plan: value === 'none' ? null : value })}
                  >
                    <SelectTrigger id="edit-subscription-plan"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subscription-end">Expiration Date</Label>
                  <Input
                    id="edit-subscription-end"
                    type="date"
                    value={selectedUser.subscription_end_date ? new Date(selectedUser.subscription_end_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, subscription_end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-subscription-price">Price (optional)</Label>
                  <Input
                    id="edit-subscription-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={selectedUser.subscription_price || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, subscription_price: e.target.value })}
                  />
                </div>
                {selectedUser.coupon_code_used && (
                  <div className="space-y-2">
                    <Label>Coupon Code Used</Label>
                    <div className="text-sm font-mono bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded border">
                      {selectedUser.coupon_code_used}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Account Details (Read-only) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b pb-2">Account Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Created At</Label>
                    <p className="mt-1">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '—'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Last Login</Label>
                    <p className="mt-1">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : '—'}</p>
                  </div>
                  {selectedUser.subscription_started_at && (
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Subscription Started</Label>
                      <p className="mt-1">{new Date(selectedUser.subscription_started_at).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">User ID</Label>
                    <p className="mt-1 font-mono text-xs">{selectedUser.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending || (editPassword && editPassword !== editPasswordConfirm)}
            >
              {updateUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete this user? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <p className="text-sm">User: <span className="font-medium">{selectedUser.email}</span></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteUserMutation.isPending}>
              {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
