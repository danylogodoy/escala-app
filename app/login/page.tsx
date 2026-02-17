"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    window.location.href = "/logs";
  }

  async function handleCadastro() {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    alert("Cadastro realizado!");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>Entrar</button>
      <button onClick={handleCadastro}>Criar Conta</button>
    </div>
  );
}
