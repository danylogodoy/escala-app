import { supabase } from "./supabaseClient";
import { getUserId } from "./db";

export type AppSettings = {
  day_rate: number;
  night_rate: number;
  meal_unit_value_default: number;
};

export async function getOrCreateSettings(): Promise<AppSettings> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sem usuário logado");

  const { data, error } = await supabase
    .from("settings")
    .select("day_rate,night_rate,meal_unit_value_default")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as AppSettings;

  const initial: AppSettings = {
    day_rate: 25,
    night_rate: 27,
    meal_unit_value_default: 15,
  };

  const ins = await supabase.from("settings").insert([{ user_id: userId, ...initial }]);
  if (ins.error) throw ins.error;

  return initial;
}
