import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso Admin — Intserfin" },
      { name: "description", content: "Acceso restringido al panel administrativo de Intserfin." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener mínimo 8 caracteres" })
    .max(72, { message: "La contraseña es demasiado larga" }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/admin-panel", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin-panel", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Sesión iniciada");
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: `${window.location.origin}/admin-panel` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si se requiere verificación.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de autenticación";
      toast.error(
        msg.toLowerCase().includes("invalid")
          ? "Credenciales inválidas"
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative">
      <a
        href="/site/index.html"
        className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Regresar al sitio
      </a>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">
            {mode === "signin" ? "Acceso Administrativo" : "Crear cuenta admin"}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">Intserfin · Panel de control</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Procesando..." : mode === "signin" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === "signin" ? (
              <>
                ¿Sin cuenta?{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Crear cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-400 text-center">
            Acceso restringido a personal autorizado de Intserfin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
