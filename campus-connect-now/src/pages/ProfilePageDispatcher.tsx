import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getApiUrl } from '@/services/connectionService';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ProfilePageDispatcher() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore(s => s._id);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Self profile check - if it is the current user, redirect to main profile tab
    if (userId === currentUserId) {
      navigate('/profile', { replace: true });
      return;
    }

    const fetchUserProfileRole = async () => {
      try {
        const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
        const res = await fetch(`${getApiUrl()}/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 403) {
          setIsBlocked(true);
          setLoading(false);
          return;
        }

        const result = await res.json();
        if (result.success && result.data) {
          const { role, userId: id } = result.data;
          
          // Redirect dynamically based on database role
          if (role === 'alumni') {
            navigate(`/alumni/${id || userId}`, { replace: true });
          } else {
            navigate(`/student/${id || userId}`, { replace: true });
          }
        } else {
          setErrorMsg(result.error || 'User profile not found.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to resolve profile routing:', err);
        setErrorMsg('Network error. Unable to load user profile.');
        setLoading(false);
      }
    };

    fetchUserProfileRole();
  }, [userId, currentUserId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <span className="text-xs font-medium tracking-wide">Resolving profile identity...</span>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-300 p-6 text-center gap-4">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <ShieldAlert className="w-10 h-10 animate-bounce" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-lg font-bold text-white">Profile Unavailable</h2>
          <p className="text-xs text-zinc-550 leading-relaxed">
            You cannot view this profile. This user has restricted access or blocked connection actions.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-zinc-900 border border-white/[0.06] text-xs font-semibold text-white rounded-xl hover:bg-zinc-850 active:scale-95 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-300 p-6 text-center gap-4">
      <div className="p-4 rounded-full bg-zinc-900 border border-white/[0.06] text-zinc-550">
        <ShieldAlert className="w-10 h-10" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h2 className="text-lg font-bold text-white">Something went wrong</h2>
        <p className="text-xs text-zinc-550 leading-relaxed">{errorMsg}</p>
      </div>
      <button
        onClick={() => navigate(-1)}
        className="px-6 py-2.5 bg-zinc-900 border border-white/[0.06] text-xs font-semibold text-white rounded-xl hover:bg-zinc-850 active:scale-95 transition-all"
      >
        Go Back
      </button>
    </div>
  );
}
