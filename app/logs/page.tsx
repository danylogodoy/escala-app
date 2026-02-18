"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { listProviders, type Provider } from "@/lib/db";
import { getOrCreateSettings } from "@/lib/settings";

type WorkLog = {
  id: string;
  provider_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_value: number;
  meals_qty: number;
  total_meal_cost: number;
  note: string | null;
};

function nowMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);

  const [filterMonth, setFilterMonth] = useState(nowMonth());
  const [filterProvider, setFilterProvider] = useState("ALL");

  const [mealUnit, setMealUnit] = useState(15);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function loadAll() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        window.location.href = "/login";
        return;
      }

      // settings
      const s = await getOrCreateSettings();
      // @ts-ignore (caso seu tipo esteja diferente, não quebra build)
      setMealUnit(Number((s as any).meal_unit ?? (s as any).meal_unit_value ?? 15));

      // providers
      const provs = await listProviders();
      setProviders(provs);

      // logs
      const { data, error } = await supabase
        .from("work_logs")
        .select("id,provider_id,date,start_time,end_time,total_value,meals_qty,total_meal_cost,note")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw new Error(error.message);
      setLogs((data ?? []) as WorkLog[]);
    } catch (e: any) {
      alert(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const logsFiltered = useMemo(() => {
    return logs.filter((r) => {
      const byMonth = r.date?.startsWith(filterMonth);
      const byProv = filterProvider === "ALL" ? true : r.provider_id === filterProvider;
      return byMonth && byProv;
    });
  }, [logs, filterMonth, filterProvider]);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
          <p className="text-sm text-gray-600">
            Unitário refeição: R$ {Number(mealUnit).toFixed(2)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/providers"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Prestadores
          </a>
          <a
            href="/summary"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Resumo
          </a>
          <a
            href="/settings"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Config
          </a>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-80"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 w-full">
          <div>
            <label className="text-xs font-medium text-gray-500">Mês</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500">Prestador</label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            >
              <option value="ALL">Todos</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Mostrando <b>{logsFiltered.length}</b> lançamento(s).
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Histórico</h2>

        {logsFiltered.length === 0 ? (
          <div className="mt-3 text-sm text-gray-600">Nenhum lançamento no filtro.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {logsFiltered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="font-medium">Data:</span> {r.date}
                  </div>
                  <div>
                    <span className="font-medium">Início:</span> {r.start_time}
                  </div>
                  <div>
                    <span className="font-medium">Fim:</span> {r.end_time}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> R$ {Number(r.total_value).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Refeições:</span> {r.meals_qty} (R${" "}
                    {Number(r.total_meal_cost).toFixed(2)})
                  </div>
                </div>

                {r.note ? (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Obs:</span> {r.note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
