import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  Plus,
  ArrowLeft,
  TrendingUp,
  Send,
  UserCheck,
  FileText,
  Eye,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin-panel")({
  head: () => ({
    meta: [{ title: "Intserfin Admin — Panel de Control" }],
  }),
  component: AdminPanel,
});

type NavKey = "dashboard" | "leads" | "email" | "settings";

const SEGMENTS = [
  "Todos los Leads",
  "Docentes (FOMAG/Magisterio)",
  "Pensionados (Colpensiones/FOPEP)",
  "Fuerzas Militares (CREMIL/CASUR)",
];

type Template = {
  id: string;
  name: string;
  segment: string;
  subject: string;
  image: string;
  body: string;
};

const TEMPLATES: Template[] = [
  {
    id: "t1",
    name: "Aprobación Rápida - Docentes",
    segment: "Docentes (FOMAG/Magisterio)",
    subject: "Docente: tu crédito FOMAG aprobado en 24h, sin salir del colegio",
    image: "/site/assets/ig/post-masvida.webp",
    body: `Hola {{nombre}},

Sabemos que tu tiempo en el aula es valioso. Por eso en Intserfin tenemos un convenio directo con FOMAG que te permite obtener tu crédito de libranza sin trámites presenciales.

✓ Aprobación en menos de 24 horas
✓ Descuento directo de nómina del Magisterio
✓ Tasas preferenciales para docentes
✓ Todo el proceso digital, sin salir del colegio

Solicita tu simulación gratuita respondiendo este correo.

Equipo Intserfin`,
  },
  {
    id: "t2",
    name: "Compra de Cartera - Pensionados",
    segment: "Pensionados (Colpensiones/FOPEP)",
    subject: "Pensionado: unifica tus deudas y baja tu cuota mensual hasta un 40%",
    image: "/site/assets/ig/post-cartera.webp",
    body: `Hola {{nombre}},

¿Tienes varios créditos descontando de tu pensión? Te ayudamos a unificarlos en una sola cuota más baja.

✓ Compra de cartera para pensionados de Colpensiones y FOPEP
✓ Reduce tu cuota mensual hasta un 40%
✓ Una sola deuda, un solo descuento
✓ Sin codeudor ni papeleo extenso

Te llamamos para una simulación sin compromiso.

Equipo Intserfin`,
  },
  {
    id: "t3",
    name: "Tasas de Referencia",
    segment: "Todos los Leads",
    subject: "Nuestras tasas desde 1.45% NMV — válidas este mes",
    image: "/site/assets/promo-pensionados.webp",
    body: `Hola {{nombre}},

Te compartimos nuestras tasas vigentes para créditos de libranza:

• Tasa desde 1.45% NMV
• Plazo hasta 144 meses
• Montos hasta $250.000.000
• Descuento directo por nómina o pensión

Las tasas pueden variar según tu pagaduría y perfil. Pide tu simulación personalizada respondiendo este correo.

Equipo Intserfin`,
  },
];

type Campaign = {
  id: string;
  name: string;
  segment: string;
  status: "Borrador" | "Enviado" | "Programado";
  date: string;
  opens: string;
};

const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: "1", name: "Aprobación Rápida - Docentes", segment: "Docentes (FOMAG/Magisterio)", status: "Enviado", date: "02 Jun 2026", opens: "28.4%" },
  { id: "2", name: "Compra de Cartera - Pensionados", segment: "Pensionados (Colpensiones/FOPEP)", status: "Enviado", date: "28 May 2026", opens: "31.2%" },
  { id: "3", name: "Tasas de Referencia Junio", segment: "Todos los Leads", status: "Programado", date: "10 Jun 2026", opens: "—" },
  { id: "4", name: "Beneficios Fuerzas Militares", segment: "Fuerzas Militares (CREMIL/CASUR)", status: "Borrador", date: "—", opens: "—" },
];

type Lead = {
  id: string;
  name: string;
  email: string;
  segment: string;
  status: "Nuevo" | "Contactado" | "Convertido";
  date: string;
};

const LEADS: Lead[] = [
  { id: "l1", name: "María González", email: "maria.g@gmail.com", segment: "Docentes (FOMAG/Magisterio)", status: "Nuevo", date: "04 Jun 2026" },
  { id: "l2", name: "Carlos Ramírez", email: "cramirez@hotmail.com", segment: "Pensionados (Colpensiones/FOPEP)", status: "Contactado", date: "03 Jun 2026" },
  { id: "l3", name: "Ana Patricia López", email: "analopez@outlook.com", segment: "Fuerzas Militares (CREMIL/CASUR)", status: "Nuevo", date: "03 Jun 2026" },
  { id: "l4", name: "Jorge Mendoza", email: "jorge.m@gmail.com", segment: "Docentes (FOMAG/Magisterio)", status: "Convertido", date: "01 Jun 2026" },
  { id: "l5", name: "Luz Marina Torres", email: "lmtorres@yahoo.com", segment: "Pensionados (Colpensiones/FOPEP)", status: "Contactado", date: "31 May 2026" },
];

function AdminPanel() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"loading" | "ok" | "denied">("loading");
  const [userEmail, setUserEmail] = useState<string>("");
  const [nav, setNav] = useState<NavKey>("email");

  useEffect(() => {
    let active = true;

    const verify = async (session: { user: { id: string; email?: string } } | null) => {
      if (!session) {
        if (active) navigate({ to: "/auth", replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setAuthState("denied");
      } else {
        setUserEmail(session.user.email ?? "");
        setAuthState("ok");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      void verify(session);
    });
    supabase.auth.getSession().then(({ data }) => void verify(data.session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-slate-900">Acceso denegado</h1>
          <p className="text-sm text-slate-600">
            Tu cuenta no tiene permisos de administrador para acceder a este panel.
          </p>
          <Button onClick={handleSignOut} variant="outline">Cerrar sesión</Button>
        </div>
      </div>
    );
  }

  const navItems: { key: NavKey; icon: typeof LayoutDashboard; label: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { key: "leads", icon: Users, label: "Leads" },
    { key: "email", icon: Mail, label: "Email Marketing" },
    { key: "settings", icon: Settings, label: "Configuración" },
  ];


  return (
    <div className="flex h-screen w-full bg-white">
      <aside className="w-64 shrink-0 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800">
          <h1 className="text-lg font-semibold tracking-tight">Intserfin Admin</h1>
          <p className="text-xs text-slate-400 mt-0.5">Panel de control</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                nav === item.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-2">
          {userEmail && (
            <p className="px-2 text-[11px] text-slate-400 truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          <p className="px-2 text-[11px] text-slate-500">v1.0 · Intserfin</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {nav === "dashboard" && <DashboardView />}
          {nav === "leads" && <LeadsView />}
          {nav === "email" && <EmailView />}
          {nav === "settings" && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function DashboardView() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen general de tu operación" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={UserCheck} label="Total Leads" value="1,245" hint="+12% este mes" />
        <StatCard icon={Send} label="Campañas enviadas" value="18" hint="Últimos 30 días" />
        <StatCard icon={TrendingUp} label="Tasa de apertura" value="24%" hint="Promedio" />
        <StatCard icon={Mail} label="Conversiones" value="87" hint="Este mes" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Leads por segmento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Docentes (FOMAG/Magisterio)", value: 487, pct: 39 },
            { label: "Pensionados (Colpensiones/FOPEP)", value: 412, pct: 33 },
            { label: "Fuerzas Militares (CREMIL/CASUR)", value: 246, pct: 20 },
            { label: "Otros", value: 100, pct: 8 },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{row.label}</span>
                <span className="text-slate-500">{row.value} · {row.pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

/* ---------------- Leads ---------------- */

function LeadsView() {
  return (
    <>
      <PageHeader title="Leads" subtitle="Solicitudes recibidas desde la web" />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEADS.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-slate-600">{l.email}</TableCell>
                  <TableCell className="text-slate-600">{l.segment}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        l.status === "Convertido"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : l.status === "Contactado"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      }
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{l.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

/* ---------------- Settings ---------------- */

function SettingsView() {
  return (
    <>
      <PageHeader title="Configuración" subtitle="Ajustes generales del panel" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label>Nombre de la empresa</Label>
            <Input defaultValue="Intserfin S.A.S." />
          </div>
          <div className="space-y-2">
            <Label>Email remitente (campañas)</Label>
            <Input defaultValue="contacto@intserfin.com" />
          </div>
          <div className="space-y-2">
            <Label>Proveedor de email</Label>
            <Select defaultValue="pending">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Sin conectar (próximamente)</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              La integración real de envío se conectará próximamente.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => toast.success("Configuración guardada")}
            >
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ---------------- Email Marketing ---------------- */

function EmailView() {
  const [view, setView] = useState<"campaigns" | "templates" | "new">("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [preview, setPreview] = useState<Template | null>(null);

  const [segment, setSegment] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment || !templateId || !subject.trim()) {
      toast.error("Completa todos los campos");
      return;
    }
    const tpl = TEMPLATES.find((t) => t.id === templateId)!;
    setCampaigns([
      {
        id: String(Date.now()),
        name: tpl.name,
        segment,
        status: "Programado",
        date: new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }),
        opens: "—",
      },
      ...campaigns,
    ]);
    toast.success(`Campaña programada para el segmento: ${segment}`);
    setSegment(""); setTemplateId(""); setSubject("");
    setView("campaigns");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Email Marketing</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona campañas y plantillas de correo
          </p>
        </div>
        {view === "campaigns" && (
          <Button onClick={() => setView("new")} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Nueva Campaña
          </Button>
        )}
        {view === "new" && (
          <Button variant="outline" onClick={() => setView("campaigns")}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <TabBtn active={view === "campaigns"} onClick={() => setView("campaigns")}>Campañas</TabBtn>
        <TabBtn active={view === "templates"} onClick={() => setView("templates")}>Plantillas</TabBtn>
      </div>

      {view === "campaigns" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon={UserCheck} label="Total Leads" value="1,245" hint="+12% este mes" />
            <StatCard icon={TrendingUp} label="Tasa de Apertura Promedio" value="24%" hint="Últimos 30 días" />
            <StatCard icon={Send} label="Campañas Activas" value="2" hint="1 programada" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Historial de campañas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Aperturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-slate-600">{c.segment}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-slate-600">{c.date}</TableCell>
                      <TableCell className="text-right font-medium">{c.opens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {view === "templates" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <Card key={t.id} className="flex flex-col overflow-hidden">
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <CardHeader>
                  <div className="h-9 w-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <FileText className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{t.segment}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-slate-600 line-clamp-3 flex-1">{t.subject}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setPreview(t)}
                  >
                    <Eye className="h-4 w-4" /> Ver plantilla
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-6">
            Las plantillas se enviarán automáticamente cuando se conecte el proveedor de email en Configuración.
          </p>
        </>
      )}

      {view === "new" && (
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="segment">Audiencia objetivo</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger id="segment"><SelectValue placeholder="Selecciona un segmento" /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">Plantilla</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger id="template"><SelectValue placeholder="Selecciona una plantilla" /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Asunto del correo</Label>
                <Input id="subject" placeholder="Ej. Tu crédito pre-aprobado te espera" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setView("campaigns")}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Programar Envío</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.segment}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 max-h-[70vh] overflow-auto">
              <div className="text-sm">
                <span className="text-slate-500">Asunto: </span>
                <span className="font-medium text-slate-900">{preview.subject}</span>
              </div>
              <div className="rounded-md overflow-hidden border border-slate-200">
                <img src={preview.image} alt={preview.name} className="w-full h-auto object-cover" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {preview.body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- Shared ---------------- */

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  icon: Icon, label, value, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{hint}</p>
          </div>
          <div className="h-9 w-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Campaign["status"] }) {
  const styles = {
    Enviado: "bg-green-100 text-green-700 hover:bg-green-100",
    Borrador: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    Programado: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}
