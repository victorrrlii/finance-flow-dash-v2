import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ensureAdminBootstrap,
  listUsersWithRoles,
  setUserRoles,
} from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Usuários — Central Financeira" }] }),
  component: UsersPage,
});

type Role = "admin" | "user";
interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: Role[];
}

function UsersPage() {
  const bootstrapFn = useServerFn(ensureAdminBootstrap);
  const listFn = useServerFn(listUsersWithRoles);
  const setRolesFn = useServerFn(setUserRoles);
  const qc = useQueryClient();

  const [bootstrapped, setBootstrapped] = useState<{ isAdmin: boolean } | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    bootstrapFn()
      .then((r) => setBootstrapped(r))
      .catch((e: Error) => setBootstrapError(e.message));
  }, [bootstrapFn]);

  const list = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: () => listFn(),
    enabled: bootstrapped?.isAdmin === true,
  });

  const mut = useMutation({
    mutationFn: (v: { user_id: string; roles: Role[] }) => setRolesFn({ data: v }),
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bootstrapError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gradient-primary">Usuários</h1>
        <p className="text-sm text-[color:var(--warning)] mt-3">{bootstrapError}</p>
      </div>
    );
  }
  if (!bootstrapped) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!bootstrapped.isAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-2">
        <h1 className="text-2xl font-semibold text-gradient-primary">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem visualizar e alterar as permissões dos usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-gradient-primary">Gerenciamento de usuários</h1>
        <p className="text-xs text-muted-foreground">
          Visualize e altere as permissões dos usuários vinculados ao aplicativo.
        </p>
      </header>

      {list.isLoading && <Skeleton className="h-40 w-full" />}
      {list.error && (
        <p className="text-sm text-[color:var(--warning)]">{(list.error as Error).message}</p>
      )}

      {list.data && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left p-3">Usuário</th>
                <th className="text-left p-3">Último acesso</th>
                <th className="text-left p-3">Permissões</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(list.data.items as UserRow[]).map((u) => (
                <UserRoleRow
                  key={u.id}
                  user={u}
                  saving={mut.isPending}
                  onSave={(roles) => mut.mutate({ user_id: u.id, roles })}
                />
              ))}
              {list.data.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRoleRow({
  user,
  saving,
  onSave,
}: {
  user: UserRow;
  saving: boolean;
  onSave: (roles: Role[]) => void;
}) {
  const [admin, setAdmin] = useState(user.roles.includes("admin"));
  const [regular, setRegular] = useState(user.roles.includes("user"));
  useEffect(() => {
    setAdmin(user.roles.includes("admin"));
    setRegular(user.roles.includes("user"));
  }, [user.roles]);

  const changed =
    admin !== user.roles.includes("admin") || regular !== user.roles.includes("user");

  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="flex items-center gap-2">
          {admin ? (
            <ShieldCheck className="size-4 text-[color:var(--primary)]" />
          ) : (
            <UserIcon className="size-4 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium">{user.email || "(sem e-mail)"}</div>
            <div className="text-[10px] text-muted-foreground">{user.id}</div>
          </div>
        </div>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleString("pt-BR")
          : "—"}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={admin} onCheckedChange={(v) => setAdmin(v === true)} />
            Admin
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={regular} onCheckedChange={(v) => setRegular(v === true)} />
            Usuário
          </label>
        </div>
      </td>
      <td className="p-3 text-right">
        <Button
          size="sm"
          disabled={!changed || saving}
          onClick={() => {
            const roles: Role[] = [];
            if (admin) roles.push("admin");
            if (regular) roles.push("user");
            onSave(roles);
          }}
        >
          Salvar
        </Button>
      </td>
    </tr>
  );
}
