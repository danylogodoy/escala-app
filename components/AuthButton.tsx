"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogged(!!session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getSession();
    setLogged(!!data.session);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return null;

  if (!logged) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
      >
        Login
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-80"
    >
      Sair
    </button>
  );
}