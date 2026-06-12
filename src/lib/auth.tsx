import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "comptable" | null;

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authStateChanged = false;

    const fetchRole = async (userId: string, email: string | undefined) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (email === "pethuelelie@gmail.com") {
        setRole("admin");
      } else {
        setRole((data?.role as Role) ?? "comptable");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, sess) => {
      authStateChanged = true;
      if (!mounted) return;
      setSession(sess);
      setLoading(false);
      if (sess?.user) {
        fetchRole(sess.user.id, sess.user.email);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: fetchedSession } }) => {
      if (!mounted) return;
      // Only use getSession's result if onAuthStateChange hasn't fired yet
      if (!authStateChanged) {
        setSession(fetchedSession);
      }
      setLoading(false);
      if (fetchedSession?.user && !authStateChanged) {
        fetchRole(fetchedSession.user.id, fetchedSession.user.email);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, role, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
