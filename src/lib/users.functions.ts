import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "admin" | "user";

async function isAdmin(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "admin");
  return (count ?? 0) > 0;
}

async function anyAdminExists(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return (count ?? 0) > 0;
}

// Bootstrap: if no admin exists yet, promote the current caller to admin.
// Returns admin status of the caller.
export const ensureAdminBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hasAny = await anyAdminExists();
    if (!hasAny) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
      return { isAdmin: true, bootstrapped: true };
    }
    return { isAdmin: await isAdmin(context.userId), bootstrapped: false };
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Acesso restrito a administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersRes, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (uErr) throw new Error(uErr.message);
    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);
    const rolesByUser = new Map<string, Role[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role as Role);
      rolesByUser.set(r.user_id, list);
    }
    const items = (usersRes.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: rolesByUser.get(u.id) ?? [],
    }));
    return { items };
  });

const SetRolesInput = z.object({
  user_id: z.string().uuid(),
  roles: z.array(z.enum(["admin", "user"])),
});

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => SetRolesInput.parse(i))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Acesso restrito a administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Prevent removing the last admin
    if (context.userId === data.user_id && !data.roles.includes("admin")) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Não é possível remover o último administrador.");
      }
    }

    const del = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (del.error) throw new Error(del.error.message);
    if (data.roles.length > 0) {
      const rows = Array.from(new Set(data.roles)).map((role) => ({
        user_id: data.user_id,
        role,
      }));
      const ins = await supabaseAdmin.from("user_roles").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }
    return { ok: true };
  });
