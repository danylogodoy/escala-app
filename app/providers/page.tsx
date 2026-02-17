"use client";

import { useEffect, useState } from "react";
import { listProviders, addProvider, setProviderActive, Provider } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";

export default function ProvidersPage() {
  const [name, setName] = useState("");
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listProviders();
      setItems(data);
    } catch (e: any) {
      alert("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    const n = name.trim();
    if (!n) return alert("Digite o nome do prestador.");
    try {
      await addProvider(n);
      setName("");
      await load();
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await setProviderActive(id, !active);
      await load();
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Prestadores</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/logs">Lançamentos</a>
          <a href="/summary">Resumo</a>
          <a href="/settings">Config</a>
          <button onClick={handleLogout}>Sair</button>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Cadastrar prestador</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            placeholder="Ex: Danylo / Fulano / Técnico X"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleAdd}>Adicionar</button>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          Dica: você pode desativar um prestador sem apagar histórico.
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div>Carregando...</div>
        ) : items.length === 0 ? (
          <div>Nenhum prestador cadastrado ainda.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name ?? "(sem nome)"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Status: {p.active ? "Ativo" : "Inativo"}
                  </div>
                </div>
                <button onClick={() => handleToggle(p.id, !!p.active)}>
                  {p.active ? "Desativar" : "Ativar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
