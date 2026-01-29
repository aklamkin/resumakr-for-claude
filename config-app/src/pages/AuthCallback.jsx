import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (token) {
      localStorage.setItem('resumakr_admin_token', token);
      navigate('/');
    } else {
      navigate('/login?error=No token received');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}
