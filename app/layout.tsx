import "./globals.css";
import AuthButton from "@/components/AuthButton";

export const metadata = {
  title: "Escala App",
  description: "Controle de escalas, horas e refeições",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      {label}
    </a>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
        {/* Topbar */}
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-black text-white">
                <span className="text-sm font-semibold">E</span>
              </div>
              <div>
                <div className="text-sm font-semibold leading-4">Escala App</div>
                <div className="text-xs text-gray-500 leading-4">
                  Horas • Valores • Refeições
                </div>
              </div>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              <NavLink href="/logs" label="Lançamentos" />
              <NavLink href="/providers" label="Prestadores" />
              <NavLink href="/summary" label="Resumo" />
              <NavLink href="/settings" label="Config" />
            </nav>

            <div className="flex items-center gap-2">
              <AuthButton />
            </div>
          </div>
        </div>

        {/* App shell */}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        {/* Footer */}
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2">
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} • Escala App
          </div>
        </footer>
      </body>
    </html>
  );
}
