import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, getSecretKey());
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new Error("Não autorizado");
    const { data: caller } = await admin.auth.getUser(authorization.slice(7));
    if (!caller.user) throw new Error("Não autorizado");
    const { data: role } = await admin.from("app_admins").select("user_id").eq("user_id", caller.user.id).maybeSingle();
    if (!role) throw new Error("Não autorizado");
    const { requestId } = await request.json();
    const { data: deletionRequest, error } = await admin.from("account_deletion_requests").select("id,user_id,email,status").eq("id", requestId).single();
    if (error || !deletionRequest) throw new Error("Solicitação não encontrada");
    if (!["requested", "in_review"].includes(deletionRequest.status)) throw new Error("Esta solicitação não pode mais ser processada");
    const reference = await sha256(`${deletionRequest.user_id}:${deletionRequest.email ?? ""}`);
    await admin.from("account_deletion_requests").update({ status: "in_review" }).eq("id", requestId);
    await admin.from("privacy_request_audit").insert({ request_id: requestId, subject_reference: reference, action: "review_started", actor_user_id: caller.user.id });
    for (const bucket of ["city-media", "condominium-assets", "broker-files"]) await removeStorageFolder(admin, bucket, deletionRequest.user_id);
    const result = await admin.auth.admin.deleteUser(deletionRequest.user_id);
    if (result.error) {
      await admin.from("privacy_request_audit").insert({ request_id: requestId, subject_reference: reference, action: "failed", actor_user_id: caller.user.id, detail: result.error.message.slice(0, 500) });
      throw result.error;
    }
    await admin.from("privacy_request_audit").insert({ request_id: requestId, subject_reference: reference, action: "deleted", actor_user_id: caller.user.id, detail: "Conta e dados vinculados excluídos por cascata." });
    return Response.json({ deleted: true }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar exclusão";
    return Response.json({ error: message }, { status: message === "Não autorizado" ? 401 : 400, headers: cors });
  }
});

function getSecretKey() {
  const current = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (current) return JSON.parse(current).default as string;
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Chave administrativa não configurada");
  return legacy;
}
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

async function removeStorageFolder(admin: any, bucket: string, folder: string) {
  const storage = admin.storage.from(bucket);
  const pending = [folder];
  const files: string[] = [];
  while (pending.length) {
    const prefix = pending.pop()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await storage.list(prefix, { limit: 100, offset });
      if (error) {
        if (/bucket not found/i.test(error.message)) break;
        throw error;
      }
      for (const item of data ?? []) {
        const path = `${prefix}/${item.name}`;
        if (item.id) files.push(path); else pending.push(path);
      }
      if (!data || data.length < 100) break;
    }
  }
  for (let index = 0; index < files.length; index += 100) {
    const { error } = await storage.remove(files.slice(index, index + 100));
    if (error) throw error;
  }
}
