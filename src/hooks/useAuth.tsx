import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { activityLogger } from '@/services/activityLogger';

type UserRole = 'admin' | 'teacher' | 'student' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role: UserRole) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const { data } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            setRole(data?.role as UserRole ?? null);
          }, 0);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => {
            setRole(data?.role as UserRole ?? null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .single();
        
        const userRole = data?.role as UserRole;
        setRole(userRole);
        
        // 📝 Registrar login exitoso en MongoDB
        await activityLogger.logLogin(
          session.session.user.id,
          email,
          userRole || 'unknown'
        );
        
        // Redirect based on role
        if (userRole === 'admin') {
          navigate('/admin');
        } else if (userRole === 'teacher') {
          navigate('/teacher');
        } else if (userRole === 'student') {
          navigate('/student');
        }
      }
    } else {
      // 📝 Registrar intento fallido de login
      await activityLogger.logFailedLogin(email, error.message);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (!error && data.user) {
      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: role,
      });
      
      await supabase.from('profiles').insert({
        user_id: data.user.id,
      });

      // 📝 Registrar nuevo usuario en MongoDB
      await activityLogger.log({
        user_id: data.user.id,
        user_email: email,
        user_role: role || 'unknown',
        activity_type: 'signup',
        module: 'auth',
        action_description: `Nuevo usuario registrado: ${email} con rol ${role}`,
        success: true,
        metadata: {
          registration_method: 'email',
        },
      });
    }

    return { error };
  };

  const signOut = async () => {
    // 📝 Registrar logout antes de cerrar sesión
    if (user?.id && user?.email) {
      await activityLogger.logLogout(user.id, user.email);
    }
    
    await supabase.auth.signOut();
    setRole(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
