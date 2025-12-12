import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: 'Authentication Failed',
        description: 'Unable to authenticate with OAuth provider. Please try again.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (token) {
      localStorage.setItem('resumakr_token', token);
      toast({
        title: 'Success',
        description: 'Successfully authenticated',
      });
      navigate('/');
    } else {
      toast({
        title: 'Error',
        description: 'No authentication token received',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg font-medium">Completing authentication...</p>
      </div>
    </div>
  );
}
