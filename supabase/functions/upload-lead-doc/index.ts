// Public edge function used by the static contact form to upload a PDF.
// Files are stored server-side with the service-role key so the bucket
// has NO public RLS policies. The function returns a short-lived signed URL
// the asesor receives via WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_REQUEST = 5;
const SIGNED_URL_TTL = 60 * 60 * 24 * 30; // 30 days
const SAFE_NAME = /[^a-zA-Z0-9._-]/g;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().includes("multipart/form-data")) {
      return json({ error: "Expected multipart/form-data" }, 400);
    }

    const form = await req.formData();
    const files = form.getAll("files").filter((v): v is File => v instanceof File);
    if (files.length === 0) return json({ error: "No files provided" }, 400);
    if (files.length > MAX_FILES_PER_REQUEST) {
      return json({ error: `Máximo ${MAX_FILES_PER_REQUEST} archivos por solicitud` }, 400);
    }

    // Lightweight identifier just to group the files in storage — NOT used for auth.
    const rawTag = String(form.get("tag") ?? "lead").slice(0, 32);
    const tag = rawTag.replace(SAFE_NAME, "") || "lead";

    for (const f of files) {
      if (f.size === 0) return json({ error: `Archivo vacío: ${f.name}` }, 400);
      if (f.size > MAX_BYTES) {
        return json({ error: `"${f.name}" supera 10 MB` }, 413);
      }
      const mime = (f.type || "").toLowerCase();
      const isPdf = mime === "application/pdf" || /\.pdf$/i.test(f.name);
      if (!isPdf) return json({ error: `"${f.name}" no es un PDF` }, 415);

      // Cheap magic-byte sniff: PDFs start with "%PDF-"
      const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
      if (head[0] !== 0x25 || head[1] !== 0x50 || head[2] !== 0x44 || head[3] !== 0x46 || head[4] !== 0x2d) {
        return json({ error: `"${f.name}" no es un PDF válido` }, 415);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return json({ error: "Server misconfigured" }, 500);
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = crypto.randomUUID().slice(0, 8);
    const folder = `${stamp}_${tag}_${rand}`;

    const uploaded: { name: string; url: string }[] = [];
    for (const file of files) {
      const cleanName = file.name.replace(SAFE_NAME, "_").slice(0, 120);
      const path = `${folder}/${cleanName}`;
      const buf = new Uint8Array(await file.arrayBuffer());
      const { error: upErr } = await admin.storage.from("lead-docs").upload(path, buf, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) {
        console.error("upload error", upErr);
        return json({ error: `No se pudo subir "${file.name}"` }, 500);
      }
      const { data: sig, error: sigErr } = await admin.storage
        .from("lead-docs")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (sigErr || !sig?.signedUrl) {
        console.error("sign error", sigErr);
        return json({ error: `No se pudo generar enlace de "${file.name}"` }, 500);
      }
      uploaded.push({ name: file.name, url: sig.signedUrl });
    }

    return json({ ok: true, files: uploaded }, 200);
  } catch (err) {
    console.error("upload-lead-doc error", err);
    return json({ error: "Unexpected server error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
