"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SettingsRow = {
  id: number;
  user_id: string;
  meal_unit_value: number;
  day_rate: number;
  night_rate: number;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [mealUnitValue, setMealUnitValue] = useState<string>("15");
  const [dayRate, setDayRate] = useState<string>("25");
  const [nightRate, setNightRate] = useState<string>("27");

  const parsed = useMemo(() => {
    const toNum = (v: string) => {
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    return {
      meal_unit_value: toNum(mealUnitValue),
      day_rate: toNum(dayRate),
      night_rate: toNum(nightRate),
    };
  }, [mealUnitValue, dayRate, nightRate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setMsg("Você precisa estar logado.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const row = data as SettingsRow;
        setMealUnitValue(String(row.meal_unit_value ?? 15));
        setDayRate(String(row.day_rate ?? 25));
        setNightRate(String(row.night_rate ?? 27));
      } else {
        // Se não existe, cria com defaults
        const { error: insErr } = await supabase.from("settings").insert({
          user_id: user.id,
          meal_unit_value: 15,
          day_rate: 25,
          night_rate: 27,
        });

        if (insErr) setMsg(insErr.message);
      }

      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      setMsg("Você precisa estar logado.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("settings")
      .update({
        meal_unit_value: parsed.meal_unit_value,
        day_rate: parsed.day_rate,
        night_rate: parsed.night_rate,
      })
      .eq("user_id", user.id);

    if (error) setMsg(error.message);
    else setMsg("Configurações salvas.");

    setSaving(false);
  }

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Config</h1>
      <p style={{ color: "#666", marginBottom: 18 }}>
        Ajuste valores globais (refeição e valores/hora). Isso não desconta da hora, só soma gasto.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <b>Valor unitário da refeição (R$)</b>
          <input
            value={mealUnitValue}
            onChange={(e) => setMealUnitValue(e.target.value)}
            placeholder="Ex: 15"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <b>Valor hora (Dia) (R$)</b>
          <input
            value={dayRate}
            onChange={(e) => setDayRate(e.target.value)}
            placeholder="Ex: 25"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <b>Valor hora (Noite) (R$)</b>
          <input
            value={nightRate}
            onChange={(e) => setNightRate(e.target.value)}
            placeholder="Ex: 27"
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          />
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
            width: 180,
          }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>

        {msg && (
          <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
