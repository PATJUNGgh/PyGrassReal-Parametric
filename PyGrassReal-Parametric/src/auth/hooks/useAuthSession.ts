import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface AuthSessionState {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Lightweight hook that tracks auth session state.
 * Use this when you only need to know if a user is logged in,
 * without fetching full profile data.
 */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({
    session: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setState({
          session,
          isAuthenticated: Boolean(session),
          isLoading: false,
        });
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setState({
          session,
          isAuthenticated: Boolean(session),
          isLoading: false,
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
