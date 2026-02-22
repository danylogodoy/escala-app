'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type AuditRow = {
  id: string;
  work_log_id: string;
  user_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;

  old_date: string | null;
  new_date: string | null;

  old_total_value: number | null;
  new_total_value: number | null;

  old_total_meal_cost: number | null;
  new_total_meal_cost: number | null;

  old_minutes_day: number | null;
  new_minutes_day: number | null;

  old_minutes_night: number | null;
  new_minutes_night: number | null;

  old_meals_qty: number | null;
  new_meals_qty: number | null;

  old_note: string | null;
  new_note: string | null;
};

function fmtMoney(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDateTime(iso: string) {
  // changed_at é timestamp sem timezone; isso aqui assume horário local do browser
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR');
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from('work_logs_audit')
        .select(
          `
          id,
          work_log_id,
          user_id,
          action,
          changed_at,
          old_date,
          new_date,
          old_total_value,
          new_total_value,
          old_total_meal_cost,
          new_total_meal_cost,
          old_minutes_day,
          new_minutes_day,
          old_minutes_night,
          new_minutes_night,
          old_meals_qty,
          new_meals_qty,
          old_note,
          new_note
        `
        )
        .order('changed_at', { ascending: false })
        .limit(200);

      if (!alive) return;

      if (error) {
        setErr(error.message ?? 'Erro ao buscar auditoria');
        setRows([]);
      } else {
        setRows((data ?? []) as AuditRow[]);
      }

      setLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Auditoria de Lançamentos
      </h1>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
        Últimos 200 eventos (INSERT/UPDATE/DELETE). Fonte: <b>work_logs_audit</b>.
      </p>

      {loading && <div>Carregando…</div>}

      {err && (
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <b>Erro:</b> {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          Sem eventos ainda.
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #eee',
            borderRadius: 10,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  Quando
                </th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  Ação
                </th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  WorkLog
                </th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  Valor (antes → depois)
                </th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  Refeição (antes → depois)
                </th>
                <th style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                  Min (dia/noite antes → depois)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td
                    style={{
                      padding: 10,
                      borderBottom: '1px solid #f3f3f3',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtDateTime(r.changed_at)}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f3f3f3' }}>
                    <b>{r.action}</b>
                  </td>
                  <td
                    style={{
                      padding: 10,
                      borderBottom: '1px solid #f3f3f3',
                      fontFamily: 'monospace',
                    }}
                  >
                    {r.work_log_id.slice(0, 8)}…
                  </td>
                  <td
                    style={{
                      padding: 10,
                      borderBottom: '1px solid #f3f3f3',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtMoney(r.old_total_value)} →{' '}
                    <b>{fmtMoney(r.new_total_value)}</b>
                  </td>
                  <td
                    style={{
                      padding: 10,
                      borderBottom: '1px solid #f3f3f3',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtMoney(r.old_total_meal_cost)} →{' '}
                    <b>{fmtMoney(r.new_total_meal_cost)}</b>
                  </td>
                  <td
                    style={{
                      padding: 10,
                      borderBottom: '1px solid #f3f3f3',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {(r.old_minutes_day ?? 0)}/{(r.old_minutes_night ?? 0)} →{' '}
                    <b>
                      {(r.new_minutes_day ?? 0)}/{(r.new_minutes_night ?? 0)}
                    </b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}