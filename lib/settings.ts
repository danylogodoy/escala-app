import { supabase } from "./supabaseClient";

export type AppSettings = {
  rate_day: number;
  rate_night: number;
  meal_unit: number;
};

export async function getOrCreateSettings(): Promise<AppSettings> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sem usuário logado");

  // tenta pegar settings
  const { data, error } = await supabase
    .from("settings")
    .select("rate_day,rate_night,meal_unit")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) {
    return {
      rate_day: Number(data.rate_day ?? 25),
      rate_night: Number(data.rate_night ?? 27),
      meal_unit: Number(data.meal_unit ?? 15),
    };
  }

  // cria se não existir
  const payload = { user_id: userId, rate_day: 25, rate_night: 27, meal_unit: 15 };

  const { data: created, error: insErr } = await supabase
    .from("settings")
    .insert(payload)
    .select("rate_day,rate_night,meal_unit")
    .single();

  if (insErr) throw new Error(insErr.message);

  return {
    rate_day: Number(created.rate_day ?? 25),
    rate_night: Number(created.rate_night ?? 27),
    meal_unit: Number(created.meal_unit ?? 15),
  };
}
