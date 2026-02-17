"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { listProviders, Provider, getUserId } from "@/lib/db";
import { calcMinutesDayNight } from "@/lib/calc";
import { getOrCreateSettings } from "@/lib/settings";
import * as XLSX from "xlsx";

type LogRow = {
  id: string;
  user_id: string;
  provider_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  minutes_day: number;
  minutes_night: number;
  total_value: number;
  meals_qty: number;
  unit_value_applied: number;
  total_meal_cost: number;
  note: string | null;
};

function monthFromDate(dateStr: string) {
  return dateStr.slice(0, 7);
}
function nowMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("19:00");
  const [note, setNote] = useState("");
  const [mealsQty, setMealsQty] = useState(0);

  const [mealUnit, setMealUnit] = useState(15);
  const [rateDay, setRateDay] = useState(25);
  const [rateNight, setRateNight] = useState(27);

  const [logs, setLogs] = useState<LogRow[]>([]);

  const [filterProvider, setFilterProvider] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState<string>(() => nowMonth());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const userId = await getUserId();

      const provs = await listProviders();
      setProviders(provs);
      if (!providerId && provs.length > 0) setProviderId(provs[0].id);

      const s = await getOrCreateSettings(userId);
      setMealUnit(Number(s.meal_unit_value || 15));
      setRateDay(Number(s.rate_day || 25));
      setRateNight(Number(s.rate_night || 27));

      await reloadLogs(userId);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadLogs(userId: string) {
    const { data, error } = await supabase
      .from("work_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }
    setLogs((data || []) as LogRow[]);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const preview = useMemo(() => {
    const { minutesDay, minutesNight } = calcMinutesDayNight(startTime, endTime);
    const total = (minutesDay / 60) * rateDay + (minutesNight / 60) * rateNight;
    const mealsCost = mealsQty * mealUnit;
    return { minutesDay, minutesNight, total, mealsCost };
  }, [startTime, endTime, mealsQty, mealUnit, rateDay, rateNight]);

  const logsFiltered = useMemo(() => {
    return logs.filter((r) => {
      const okMonth = monthFromDate(r.date) === filterMonth;
      const okProvider =
        filterProvider === "ALL" ? true : r.provider_id === filterProvider;
      return okMonth && okProvider;
    });
  }, [logs, filterMonth, filterProvider]);

  const totals = useMemo(() => {
    const totalMinutes = logsFiltered.reduce(
      (acc, r) =>
        acc + Number(r.minutes_day || 0) + Number(r.minutes_night || 0),
      0
    );
    const totalHours = totalMinutes / 60;

    const totalValue = logsFiltered.reduce(
      (acc, r) => acc + Number(r.total_value || 0),
      0
    );

    const totalMealsQty = logsFiltered.reduce(
      (acc, r) => acc + Number(r.meals_qty || 0),
      0
    );

    const totalMealsCost = logsFiltered.reduce(
      (acc, r) => acc + Number(r.total_meal_cost || 0),
      0
    );

    return { totalHours, totalValue, totalMealsQty, totalMealsCost };
  }, [logsFiltered]);

  async function handleSave() {
    const userId = await getUserId();
    if (!providerId) return alert("Cadastre um prestador primeiro.");

    const overlap = logs.find(
      (r) =>
        r.provider_id === providerId &&
        r.date === date &&
        r.start_time === `${startTime}:00` &&
        r.end_time === `${endTime}:00`
    );
    if (overlap)
      return alert("Já existe um lançamento com esse horário para esse prestador.");

    const { minutesDay, minutesNight } = calcMinutesDayNight(startTime, endTime);
    const totalValue =
      (minutesDay / 60) * rateDay + (minutesNight / 60) * rateNight;

    const totalMealCost = mealsQty * mealUnit;

    const { error } = await supabase.from("work_logs").insert({
      user_id: userId,
      provider_id: providerId,
      date,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      minutes_day: minutesDay,
      minutes_night: minutesNight,
      total_value: totalValue,
      meals_qty: mealsQty,
      unit_value_applied: mealUnit,
      total_meal_cost: totalMealCost,
      note: note?.trim() ? note.trim() : null,
    });

    if (error) return alert(error.message);

    setNote("");
    setMealsQty(0);

    await reloadLogs(userId);
  }

  async function handleDelete(id: string) {
    const ok = confirm("Excluir este lançamento?");
    if (!ok) return;

    const { error } = await supabase.from("work_logs").delete().eq("id", id);
    if (error) return alert(error.message);

    const userId = await getUserId();
    await reloadLogs(userId);
  }

  function exportExcelFiltered() {
  const rows = logsFiltered.map((r) => {
    const providerName =
      providers.find((p) => p.id === r.provider_id)?.name || r.provider_id;

    return {
      Data: r.date,
      Prestador: providerName,
      Inicio: r.start_time,
      Fim: r.end_time,
      "Horas Dia": Number(r.minutes_day || 0) / 60,
      "Horas Noite": Number(r.minutes_night || 0) / 60,
      "Total (R$)": Number(r.total_value || 0),
      "Refeições (Qtd)": Number(r.meals_qty || 0),
      "Refeições (R$)": Number(r.total_meal_cost || 0),
      Obs: r.note || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajuste simples de largura das colunas
  ws["!cols"] = [
    { wch: 12 }, // Data
    { wch: 22 }, // Prestador
    { wch: 10 }, // Inicio
    { wch: 10 }, // Fim
    { wch: 12 }, // Horas Dia
    { wch: 12 }, // Horas Noite
    { wch: 12 }, // Total
    { wch: 14 }, // Refeições Qtd
    { wch: 14 }, // Refeições R$
    { wch: 30 }, // Obs
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lancamentos");

  const fileName =
    `lancamentos_${filterMonth}_` +
    (filterProvider === "ALL" ? "todos" : "prestador") +
    ".xlsx";

  XLSX.writeFile(wb, fileName);
}


  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="text-sm text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lançamentos</h1>
          <p className="text-sm text-gray-600">
            Registre horários fora da escala, refeições e acompanhe totais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/providers"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Gerenciar prestadores
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

      {/* Filtros */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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

          <button
            onClick={() => {
              setFilterMonth(nowMonth());
              setFilterProvider("ALL");
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Mostrando <b>{logsFiltered.length}</b> lançamento(s) em{" "}
          <b>{filterMonth}</b> •{" "}
          <b>
            {filterProvider === "ALL"
              ? "Todos os prestadores"
              : providers.find((p) => p.id === filterProvider)?.name || "Prestador"}
          </b>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500">Prestador</label>
            <select
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Data</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">
              Refeições (0 a 5)
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              value={mealsQty}
              onChange={(e) => setMealsQty(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
              Unitário: R$ {mealUnit.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Início</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Fim</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500">Observação</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
              placeholder="Ex: extra / cobertura / etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="font-medium">Dia:</span>{" "}
              {(preview.minutesDay / 60).toFixed(2)} h
            </div>
            <div>
              <span className="font-medium">Noite:</span>{" "}
              {(preview.minutesNight / 60).toFixed(2)} h
            </div>
            <div>
              <span className="font-medium">Total R$:</span>{" "}
              {preview.total.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Refeições R$:</span>{" "}
              {preview.mealsCost.toFixed(2)}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Salvar lançamento
        </button>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Histórico</h2>
            <div className="text-xs text-gray-500">
              {logsFiltered.length} lançamento(s) (filtrado)
            </div>
          </div>

          <button
            onClick={() => {
              if (logsFiltered.length === 0) {
                alert("Não há lançamentos no filtro para exportar.");
                return;
              }
              exportExcelFiltered();
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Exportar XLS
          </button>
        </div>

        {logsFiltered.length === 0 ? (
          <div className="mt-3 text-sm text-gray-600">Nenhum lançamento no filtro.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {logsFiltered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                      <span className="font-medium">Total:</span> R${" "}
                      {Number(r.total_value).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Refeições:</span> {r.meals_qty} (R${" "}
                      {Number(r.total_meal_cost).toFixed(2)})
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Excluir
                  </button>
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

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-semibold">Totais (do filtro)</div>

          <div className="mt-2 grid gap-2 text-sm md:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500">Horas trabalhadas</div>
              <div className="text-lg font-semibold">
                {totals.totalHours.toFixed(2)} h
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500">Total em R$</div>
              <div className="text-lg font-semibold">{totals.totalValue.toFixed(2)}</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500">Refeições (qtde)</div>
              <div className="text-lg font-semibold">{totals.totalMealsQty}</div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs text-gray-500">Refeições (R$)</div>
              <div className="text-lg font-semibold">
                {totals.totalMealsCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
