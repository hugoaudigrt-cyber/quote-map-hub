import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUsuarioSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome"),
  email: z.string().trim().email("Informe um e-mail válido"),
  cargo: z.string().trim().optional(),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

async function ensureEmpresaForUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("ensure_usuario_empresa_for_user", {
    _user_id: userId,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível validar a empresa do usuário");
  }

  return data;
}

export const ensureEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const empresaId = await ensureEmpresaForUser(context.userId);
    return { empresa_id: empresaId };
  });

export const createUsuarioEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createUsuarioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const empresaId = await ensureEmpresaForUser(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        nome: data.nome,
        cargo: data.cargo ?? null,
      },
      app_metadata: {
        empresa_id: empresaId,
      },
    });

    if (error || !created.user) {
      throw new Error(error?.message ?? "Não foi possível criar o usuário");
    }

    const { error: profileError } = await supabaseAdmin.from("usuarios").upsert({
      id: created.user.id,
      empresa_id: empresaId,
      nome: data.nome,
      email: data.email,
      cargo: data.cargo || null,
      deleted_at: null,
    });

    if (profileError) throw new Error(profileError.message);

    return { id: created.user.id };
  });