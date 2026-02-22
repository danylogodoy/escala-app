"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { listProviders, type Provider } from "@/lib/db";
import * as XLSX from "xlsx";

type WorkLog = {
  id: string;
  provider_id: string;
  date: string;
  minutes_day: number | null;
  minutes_night: number | null;
  total_value: number | null;
  meals_qty: number | null;
  total_meal_cost: number | null;
};

function nowMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const money = (n: number) => n.toFixed(2);

const formatHM = (minutes: number) => {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h${String(mm).padStart(2, "0")}min`;
};

const formatHOnly = (minutes: number) => {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.round(m / 60);
  return `${h}h`;
};

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);

  const [filterMonth, setFilterMonth] = useState(nowMonth());
  const [filterProvider, setFilterProvider] = useState("ALL");

  async function loadAll() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      const provs = await listProviders();
      setProviders(provs);

      const { data, error } = await supabase
        .from("work_logs")
        .select(
          "id,provider_id,date,minutes_day,minutes_night,total_value,meals_qty,total_meal_cost"
        )
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
      const byProv =
        filterProvider === "ALL" ? true : r.provider_id === filterProvider;

      return byMonth && byProv;
    });
  }, [logs, filterMonth, filterProvider]);

  const totals = useMemo(() => {
    
    function exportToExcel() {
  if (!logsFiltered.length) {
    alert("Nenhum lançamento para exportar.");
    return;
  }

  const rows = logsFiltered.map((r) => {
    const totalMinutes =
      Number(r.minutes_day ?? 0) + Number(r.minutes_night ?? 0);

    return {
      Data: r.date,
      Dia_horas: formatHM(Number(r.minutes_day ?? 0)),
      Noite_horas: formatHM(Number(r.minutes_night ?? 0)),
      Total_horas: formatHM(totalMinutes),
      Total_R$: Number(r.total_value ?? 0),
      Refeições: Number(r.meals_qty ?? 0),
      Refeições_R$: Number(r.total_meal_cost ?? 0),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo");

  XLSX.writeFile(workbook, `Resumo_${filterMonth}.xlsx`);
}let minDay = 0;
    let minNight = 0;
    let totalValue = 0;
    let mealsQty = 0;
    let mealCost = 0;

    for (const r of logsFiltered) {
      minDay += Number(r.minutes_day ?? 0);
      minNight += Number(r.minutes_night ?? 0);
      totalValue += Number(r.total_value ?? 0);
      mealsQty += Number(r.meals_qty ?? 0);
      mealCost += Number(r.total_meal_cost ?? 0);
    }

    const totalMinutes = minDay + minNight;

    return {
      minDay,
      minNight,
      totalMinutes,
      totalValue,
      mealsQty,
      mealCost,
      count: logsFiltered.length,
    };
  }, [logsFiltered]);

  if (loading) return <div className="p-6">Carregando...</div>;
  const exportToExcel = () => {
  const rows = logsFiltered.map((r) => {
    const minDay = Number(r.minutes_day ?? 0);
    const minNight = Number(r.minutes_night ?? 0);
    const totalHorasRS = Number(r.total_value ?? 0);
    const qtdRefeicoes = Number(r.meals_qty ?? 0);
    const totalRefRS = Number(r.total_meal_cost ?? 0);

    const provName =
      providers.find((p) => p.id === r.provider_id)?.name ?? "—";

    return {
      Data: r.date,
      Prestador: provName,
      "Tempo Dia": formatHM(minDay),
      "Tempo Noite": formatHM(minNight),
      "Total Horas (R$)": Number(totalHorasRS.toFixed(2)),
      "Qtd Refeições": qtdRefeicoes,
      "Total Refeições (R$)": Number(totalRefRS.toFixed(2)),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resumo");

  const filename =
    filterProvider === "ALL"
      ? `resumo-${filterMonth}.xlsx`
      : `resumo-${filterMonth}-${filterProvider}.xlsx`;

  XLSX.writeFile(wb, filename);
};

  return (
  <div className="space-y-6 p-6">
    {/* Header */}
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumo</h1>
        <p className="text-sm text-gray-600">
          Mostrando <b>{totals.count}</b> lançamento(s).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exportToExcel}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-80"
        >
          Exportar Excel
        </button>

        <a
          href="/logs"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          Lançamentos
        </a>
        <a
          href="/providers"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          Prestadores
        </a>
        <a
          href="/settings"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        >
          Config
        </a>
      </div>
    </div>

    {/* Filtros */}
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
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
    </div>

    {/* Cards */}
    <div className="grid gap-4 md:grid-cols-2">
      {/* Horas */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-gray-500">Horas</div>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Dia</span>
            <b>{formatHM(totals.minDay)}</b>
          </div>

          <div className="flex items-center justify-between">
            <span>Noite</span>
            <b>{formatHM(totals.minNight)}</b>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span>Total</span>
            <b>{formatHOnly(totals.totalMinutes)}</b>
          </div>
        </div>
      </div>

      {/* Valores */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-gray-500">Valores</div>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Quantidade de refeições</span>
            <b>{totals.mealsQty} refeição(ões)</b>
          </div>

          <div className="flex items-center justify-between">
            <span>Total refeições (R$)</span>
            <b>{money(totals.mealCost)}</b>
          </div>

          <div className="flex items-center justify-between">
            <span>Total horas (R$)</span>
            <b>{money(totals.totalValue)}</b>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span>Total geral (sem refeições)</span>
            <b>{money(totals.totalValue)}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}