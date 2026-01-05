import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Shield, LogOut, Crown, Sparkles } from 'lucide-react';
import { formatDateWithYear } from '../components/utils/dateUtils';

export default function AccountSettings() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const handleLogout = () => {
    localStorage.removeItem('resumakr_token');
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      console.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      console.error('Password must be at least 8 characters');
      return;
    }

    setChanging(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error.response?.data?.error || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account preferences and security</p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Account Information</CardTitle>
            </div>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="mt-1" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={user?.full_name || ''} disabled className="mt-1" />
            </div>
            <div>
              <Label>Account Type</Label>
              <Input value={user?.role || 'user'} disabled className="mt-1 capitalize" />
            </div>
          </CardContent>
        </Card>

        {/* Password Change - Only for non-OAuth users */}
        {!user?.oauth_provider && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1"
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters
                </p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={changing}>
                {changing ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {user?.is_subscribed && user?.subscription_plan && user?.subscription_end_date ? (
                <Crown className="h-5 w-5 text-yellow-600" />
              ) : (
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle>Subscription</CardTitle>
            </div>
            <CardDescription>
              {user?.is_subscribed && user?.subscription_plan ? 'Your active subscription' : 'Manage your subscription'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Status</Label>
              <div className="mt-1 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${user?.is_subscribed && user?.subscription_plan ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">
                  {user?.is_subscribed && user?.subscription_plan ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div>
              <Label>Plan</Label>
              <Input
                value={user?.subscription_plan ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) : 'None'}
                disabled
                className="mt-1 capitalize"
              />
            </div>

            {user?.subscription_end_date && (
              <div>
                <Label>Valid Until</Label>
                <Input
                  value={formatDateWithYear(user.subscription_end_date)}
                  disabled
                  className="mt-1"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                variant={user?.is_subscribed && user?.subscription_plan ? "outline" : "default"}
                onClick={() => navigate('/pricing')}
                className="w-full"
              >
                {user?.is_subscribed && user?.subscription_plan ? 'Manage Subscription' : 'Subscribe to Activate'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              <CardTitle>Sign Out</CardTitle>
            </div>
            <CardDescription>Log out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
