import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return Response.json({ error: "IA não configurada" }, { status: 503, headers: cors });
  try {
    const { text, image } = await request.json();
    if ((!text || String(text).trim().length < 4) && !image) return Response.json({ error: "Envie texto ou imagem" }, { status: 400, headers: cors });
    const content: Array<Record<string, unknown>> = [{ type: "text", text: `Extraia somente dados explicitamente presentes. Não invente. Conversa:\n${String(text ?? "").slice(0, 12000)}` }];
    if (image) content.push({ type: "image_url", image_url: { url: image, detail: "high" } });
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0,
        response_format: { type: "json_schema", json_schema: { name: "client_intake", strict: true, schema: { type: "object", additionalProperties: false, properties: {
          name: { type: "string" }, phone: { type: ["string", "null"] }, whatsapp: { type: ["string", "null"] }, email: { type: ["string", "null"] }, city: { type: ["string", "null"] }, neighborhood: { type: ["string", "null"] }, property_profile: { type: ["string", "null"] }, budget_min: { type: ["number", "null"] }, budget_max: { type: ["number", "null"] }, payment_condition: { type: ["string", "null"] }, bedrooms: { type: ["number", "null"] }, notes: { type: ["string", "null"] }, source: { type: ["string", "null"] }, status: { type: "string", enum: ["lead","em contato","qualificado","visita agendada","proposta","negociação","venda realizada","pós-venda","perdido"] }, sale_date: { type: ["string", "null"] }, next_follow_up: { type: ["string", "null"] }
        }, required: ["name","phone","whatsapp","email","city","neighborhood","property_profile","budget_min","budget_max","payment_condition","bedrooms","notes","source","status","sale_date","next_follow_up"] } } },
        messages: [{ role: "system", content: "Você organiza leads imobiliários brasileiros. Extraia nome, contatos, localização, perfil de imóvel, orçamento, condição de pagamento e etapa. Se faltar, use null. Preserve a conversa em notes com resumo factual." }, { role: "user", content }]
      })
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const payload = await response.json();
    const result = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
    return Response.json(result, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível analisar o conteúdo" }, { status: 500, headers: cors });
  }
});
