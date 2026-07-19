import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Upload, Table2, LogOut, Wallet, Landmark, Tags, Users, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    router.navigate({ to: "/login" });
  };
  return (
    <div className="min-h-screen flex">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Mostrar menu lateral"
          className="hidden md:flex fixed top-3 left-3 z-40 items-center justify-center size-9 rounded-lg glass border border-border hover:bg-muted/60 transition"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      ) : (
        <aside className="hidden md:flex flex-col w-60 glass border-r border-border p-4 gap-1 sticky top-0 h-screen">
          <div className="flex items-center justify-between px-2 py-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 rounded-lg shrink-0" style={{ background: "var(--gradient-primary)" }} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Central Financeira</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Inteligente</div>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Ocultar menu lateral"
              className="p-1 rounded hover:bg-muted/60 transition shrink-0"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
          <NavItem to="/" icon={<LayoutDashboard className="size-4" />} label="Dashboard" />
          <NavItem to="/transactions" icon={<Table2 className="size-4" />} label="Lançamentos" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 pt-3">Cadastros</div>
          <NavItem to="/accounts" icon={<Landmark className="size-4" />} label="Contas" />
          <NavItem to="/categories" icon={<Tags className="size-4" />} label="Categorias" />
          <NavItem to="/import" icon={<Upload className="size-4" />} label="Importar" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 pt-3">Administração</div>
          <NavItem to="/users" icon={<Users className="size-4" />} label="Usuários" />
          <div className="mt-auto">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </aside>
      )}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-border glass">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-[color:var(--success)]" />
            <span className="text-sm font-semibold">Central Financeira</span>
          </div>
          <div className="flex gap-2 text-xs">
            <Link to="/" className="px-2 py-1">Dash</Link>
            <Link to="/transactions" className="px-2 py-1">Tabela</Link>
            <Link to="/import" className="px-2 py-1">Importar</Link>
            <button onClick={signOut} className="px-2 py-1">Sair</button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}


function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
      activeProps={{ className: "flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted/60 text-foreground" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon} {label}
    </Link>
  );
}
