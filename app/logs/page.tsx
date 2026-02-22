"use client";
import { useRouter } from "next/navigation";
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

// Form único: serve pra Novo / Editar / Duplicar
const [formMode, setFormMode] = useState<"NEW" | "EDIT" | "DUPLICATE">("NEW");
const [formLogId, setFormLogId] = useState<string | null>(null);

const [form, setForm] = useState({
  provider_id: "",
  date: "",
  start_time: "",
  end_time: "",
  meals_qty: 0,
  note: ""
});

const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState({
  provider_id: "",
  date: "",
  start_time: "",
  end_time: "",
  meals_qty: 0,
  note: ""
});

const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");

  }

  async function loadAll() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
      router.push("/login");

        return;
      }

      // settings
      const s = await getOrCreateSettings();
      // @ts-ignore (caso seu tipo esteja diferente, não quebra build)
      setMealUnit(Number((s as any).meal_unit ?? (s as any).meal_unit_value ?? 15));

      // providers
      const provs = await listProviders();
setProviders(provs);

// se for primeiro load e ainda não escolheu prestador, seta o primeiro ativo
if (provs?.length && !form.provider_id) {
  setForm((prev) => ({ ...prev, provider_id: provs[0].id }));
}

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
<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-lg font-semibold">
      {formMode === "NEW"
        ? "Novo Lançamento"
        : formMode === "EDIT"
        ? "Editar Lançamento"
        : "Duplicar Lançamento"}
    </h2>

    {formMode !== "NEW" ? (
      <button
        onClick={() => {
  setFormMode("NEW");
  setFormLogId(null);
  setForm({
    provider_id: providers?.[0]?.id ?? "",
    date: "",
    start_time: "",
    end_time: "",
    meals_qty: 0,
    note: "",
  });
}}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs hover:bg-gray-50"
      >
        Voltar para Novo
      </button>
    ) : null}
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-2">
    <div>
      <label className="text-xs font-medium text-gray-500">Prestador</label>
      <select
        value={form.provider_id}
        onChange={(e) => setForm((prev) => ({ ...prev, provider_id: e.target.value }))}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
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
        type="date"
        value={form.date}
        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Início</label>
      <input
        type="time"
        value={form.start_time}
        onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Fim</label>
      <input
        type="time"
        value={form.end_time}
        onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Refeições</label>
      <input
        type="number"
        value={form.meals_qty}
        onChange={(e) => setForm((prev) => ({ ...prev, meals_qty: Number(e.target.value) }))}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Observação</label>
      <input
        type="text"
        value={form.note}
        onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>
  </div>

  <button
    onClick={async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          alert("Você precisa estar logado.");
          return;
        }

        if (!form.provider_id || !form.date || !form.start_time || !form.end_time) {
          alert("Preencha prestador, data, início e fim.");
          return;
        }

        const { data: settings, error: settingsErr } = await supabase
          .from("settings")
          .select("rate_day, rate_night")
          .eq("user_id", userId)
          .single();

        if (settingsErr) throw new Error(settingsErr.message);

        const rateDay = Number(settings?.rate_day ?? 0);
        const rateNight = Number(settings?.rate_night ?? 0);

        const parseTimeToMin = (t: string) => {
          const [hh, mm] = t.split(":").map(Number);
          return hh * 60 + mm;
        };

        let startMin = parseTimeToMin(form.start_time);
        let endMin = parseTimeToMin(form.end_time);
        if (endMin < startMin) endMin += 24 * 60;

        const diffMinutes = Math.max(0, endMin - startMin);

        let minutes_morning = 0;
        let minutes_afternoon = 0;
        let minutes_night = 0;

        for (let i = 0; i < diffMinutes; i++) {
          const minuteOfDay = (startMin + i) % (24 * 60);
          const isNight = minuteOfDay >= 19 * 60 || minuteOfDay < 7 * 60;

          if (isNight) minutes_night++;
          else if (minuteOfDay >= 7 * 60 && minuteOfDay < 13 * 60) minutes_morning++;
          else minutes_afternoon++;
        }

        const minutes_day = minutes_morning + minutes_afternoon;

        const total_value = Number(
          ((minutes_day / 60) * rateDay + (minutes_night / 60) * rateNight).toFixed(2)
        );

        const total_meal_cost = Number((Number(form.meals_qty || 0) * mealUnit).toFixed(2));

        if (formMode === "EDIT" && formLogId) {
          const { error } = await supabase
            .from("work_logs")
            .update({
              provider_id: form.provider_id,
              date: form.date,
              start_time: form.start_time,
              end_time: form.end_time,
              meals_qty: Number(form.meals_qty || 0),
              total_meal_cost,
              minutes_day,
              minutes_night,
              total_value,
              note: form.note || null
            })
            .eq("id", formLogId)
            .eq("user_id", userId);

          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from("work_logs").insert({
            user_id: userId,
            provider_id: form.provider_id,
            date: form.date,
            start_time: form.start_time,
            end_time: form.end_time,
            minutes_day,
            minutes_night,
            total_value,
            meals_qty: Number(form.meals_qty || 0),
            total_meal_cost,
            note: form.note || null
          });

          if (error) throw new Error(error.message);
        }

        await loadAll();

        setFormMode("NEW");
        setFormLogId(null);
        setForm((prev) => ({
          ...prev,
          date: "",
          start_time: "",
          end_time: "",
          meals_qty: 0,
          note: ""
        }));
      } catch (e: any) {
        alert(e?.message ?? String(e));
      }
    }}
    className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-80"
  >
    {formMode === "EDIT" ? "Salvar edição" : "Salvar lançamento"}
  </button>
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
              <div key={r.id} className="rounded-2xl border border-gray-200 p-4 flex justify-between items-center">
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
                <div className="flex gap-2">
  <button
    onClick={() => {
      // abre em modo edição, mas SEM id (vai virar um novo lançamento quando você salvar pelo botão de "Novo Lançamento")
      setEditingId("DUPLICATE");
      setEditForm({
        provider_id: r.provider_id,
        date: r.date,
        start_time: r.start_time,
        end_time: r.end_time,
        meals_qty: r.meals_qty,
        note: (r.note ? `${r.note} (cópia)` : "cópia")
      });

      // opcional: joga o filtro do mês pro mês do item duplicado
      if (r.date?.length >= 7) setFilterMonth(r.date.slice(0, 7));
      setFilterProvider("ALL");
    }}
    className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
  >
    Duplicar
  </button>

  <button
  className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
  onClick={() => {
    setFormMode("EDIT");
    setFormLogId(r.id);

    setForm({
      provider_id: r.provider_id,
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
      meals_qty: r.meals_qty,
      note: r.note ?? ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
>
  Editar
</button>

  <button
    onClick={async () => {
      const confirmDelete = confirm("Excluir este lançamento?");
      if (!confirmDelete) return;

      const { error } = await supabase
        .from("work_logs")
        .delete()
        .eq("id", r.id);

      if (error) {
        alert(error.message);
        return;
      }

      loadAll();
    }}
    className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
  >
    Excluir
  </button>
</div>

                {r.note ? (
  <div className="mt-2 text-sm text-gray-600">
    <span className="font-medium">Obs:</span> {r.note}
  </div>
) : null}

{editingId === r.id || editingId === "DUPLICATE" ? (
  <div className="mt-4 grid gap-3 md:grid-cols-2">
    <div>
      <label className="text-xs font-medium text-gray-500">Prestador</label>
      <select
        value={editForm.provider_id}
        onChange={(e) => setEditForm({ ...editForm, provider_id: e.target.value })}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
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
        type="date"
        value={editForm.date}
        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Início</label>
      <input
        type="time"
        value={editForm.start_time}
        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Fim</label>
      <input
        type="time"
        value={editForm.end_time}
        onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Refeições</label>
      <input
        type="number"
        value={editForm.meals_qty}
        onChange={(e) => setEditForm({ ...editForm, meals_qty: Number(e.target.value) })}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs font-medium text-gray-500">Observação</label>
      <input
        type="text"
        value={editForm.note}
        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
      />
    </div>

    <div className="flex gap-2 md:col-span-2">
      <button
  onClick={async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        alert("Você precisa estar logado.");
        return;
      }

      if (!editForm.provider_id || !editForm.date || !editForm.start_time || !editForm.end_time) {
        alert("Preencha prestador, data, início e fim.");
        return;
      }

      // pega rates
      const { data: settings, error: settingsErr } = await supabase
        .from("settings")
        .select("rate_day, rate_night")
        .eq("user_id", userId)
        .single();

      if (settingsErr) throw new Error(settingsErr.message);

      const rateDay = Number(settings?.rate_day ?? 0);
      const rateNight = Number(settings?.rate_night ?? 0);

      // ====== RECÁLCULO (mesma regra Manhã/Tarde/Noite) ======
      const parseTimeToMin = (t: string) => {
        const [hh, mm] = t.split(":").map(Number);
        return hh * 60 + mm;
      };

      let startMin = parseTimeToMin(editForm.start_time);
      let endMin = parseTimeToMin(editForm.end_time);

      // virou meia-noite
      if (endMin < startMin) endMin += 24 * 60;

      const diffMinutes = Math.max(0, endMin - startMin);

      let minutes_morning = 0;     // 07:00–13:00
      let minutes_afternoon = 0;   // 13:00–19:00
      let minutes_night = 0;       // 19:00–07:00

      for (let i = 0; i < diffMinutes; i++) {
        const minuteOfDay = (startMin + i) % (24 * 60);

        const isNight = minuteOfDay >= 19 * 60 || minuteOfDay < 7 * 60;

        if (isNight) minutes_night++;
        else if (minuteOfDay >= 7 * 60 && minuteOfDay < 13 * 60) minutes_morning++;
        else minutes_afternoon++;
      }

      const minutes_day = minutes_morning + minutes_afternoon;

      const total_value = Number(
        ((minutes_day / 60) * rateDay + (minutes_night / 60) * rateNight).toFixed(2)
      );

      const total_meal_cost = Number(
        (Number(editForm.meals_qty || 0) * mealUnit).toFixed(2)
      );
      // =======================================================

      let saveErr: any = null;

if (editingId === "DUPLICATE") {
  // cria um novo lançamento
  const { error } = await supabase.from("work_logs").insert({
    user_id: userId,
    provider_id: editForm.provider_id,
    date: editForm.date,
    start_time: editForm.start_time,
    end_time: editForm.end_time,
    meals_qty: Number(editForm.meals_qty || 0),
    total_meal_cost,
    minutes_day,
    minutes_night,
    total_value,
    note: editForm.note || null
  });

  saveErr = error;
} else {
  // edita o lançamento existente
  const { error } = await supabase
    .from("work_logs")
    .update({
      provider_id: editForm.provider_id,
      date: editForm.date,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      meals_qty: Number(editForm.meals_qty || 0),
      total_meal_cost,
      minutes_day,
      minutes_night,
      total_value,
      note: editForm.note || null
    })
    .eq("id", r.id)
    .eq("user_id", userId);

  saveErr = error;
}

if (saveErr) throw new Error(saveErr.message);

      setEditingId(null);
      await loadAll();
      // opcional: feedback leve
console.log("Edição salva.");
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  }}
  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-80"
>
  Salvar edição
</button>

      <button
        onClick={() => setEditingId(null)}
        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
      >
        Cancelar
      </button>
    </div>
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
