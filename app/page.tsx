export default function Home() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h1 className="text-2xl font-semibold">Escala App</h1>

      <p className="mt-2 text-gray-600">
        Use o menu acima para acessar Lançamentos, Prestadores, Resumo e Config.
      </p>

      <div className="mt-4 flex gap-3">
        <a
          href="/logs"
          className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Ir para Lançamentos
        </a>

        <a
          href="/login"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 hover:bg-gray-50"
        >
          Login
        </a>
      </div>
    </div>
  );
}
