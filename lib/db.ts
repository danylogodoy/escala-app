import { supabase } from "./supabaseClient";

export type Provider = {
  id: string;
  name: string | null;
  active: boolean | null;
};

export async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function listProviders(): Promise<Provider[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("providers")
    .select("id,name,active")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Provider[];
}

export async function addProvider(name: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("Sem usuário logado");

  const { error } = await supabase.from("providers").insert([
    { user_id: userId, name, active: true },
  ]);

  if (error) throw error;
}

export async function setProviderActive(id: string, active: boolean) {
  const { error } = await supabase.from("providers").update({ active }).eq("id", id);
  if (error) throw error;
}
