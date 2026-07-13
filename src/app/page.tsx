'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Radio,
  Settings,
  Mic2,
  ArrowRightLeft,
  LogOut,
  History,
  Copy,
  Check,
  Save,
  Trash2,
  Database,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigStatus {
  provider: string;
  geminiConfigured: boolean;
  geminiModel: string;
  openRouterConfigured: boolean;
  notionConfigured: boolean;
  notionDbReady: boolean;
}

interface Libreto {
  id: string;
  tipo: string;
  numero: number;
  contenido: string;
}

interface GenerationResult {
  generationId: string;
  franja: string;
  genero: string;
  createdAt: string;
  entradas: Libreto[];
  puentes: Libreto[];
  puentesLargos: Libreto[];
  salidas: Libreto[];
}

interface HistoryItem {
  id: string;
  franja: string;
  genero: string;
  duracion: string;
  createdAt: string;
  totalLibretos: number;
  tipos: string;
  libretos: Libreto[];
}

export default function Home() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generar');

  // Config state
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [provider, setProvider] = useState('google');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [notionToken, setNotionToken] = useState('');
  const [notionPageId, setNotionPageId] = useState('');
  const [locutorNombre, setLocutorNombre] = useState('');
  const [franjaHorario, setFranjaHorario] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingDb, setCreatingDb] = useState(false);
  const [savingPageId, setSavingPageId] = useState(false);

  // Form state
  const [franja, setFranja] = useState('');
  const [genero, setGenero] = useState('');
  const [duracion, setDuracion] = useState('2h');
  const [cantidadPuentes, setCantidadPuentes] = useState(3);
  const [incluirPuentesLargos, setIncluirPuentesLargos] = useState(false);
  const [cantidadPuentesLargos, setCantidadPuentesLargos] = useState(2);
  const [playlist, setPlaylist] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Results state
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [resultTab, setResultTab] = useState('entradas');
  const [savingNotion, setSavingNotion] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  // Version state
  const [appVersion, setAppVersion] = useState('1.1.0');

  const fetchVersion = useCallback(async () => {
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      if (data.version) setAppVersion(data.version);
    } catch { /* silent */ }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfigStatus(data);
      if (data.geminiModel) setGeminiModel(data.geminiModel);
      if (data.provider) setProvider(data.provider);
      if (data.locutorNombre) setLocutorNombre(data.locutorNombre);
      if (data.franjaHorario) setFranjaHorario(data.franjaHorario);
    } catch {
      // silent
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data.generations || []);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchVersion();
    fetchConfig();
  }, [fetchVersion, fetchConfig]);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, geminiApiKey: geminiKey, geminiModel, openRouterKey, notionToken: notionToken, locutorNombre, franjaHorario }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Configuración guardada' });
        setConfigStatus(data.config);
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSavePageId = async () => {
    if (!notionPageId.trim()) return;
    setSavingPageId(true);
    try {
      const res = await fetch('/api/notion/pageid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: notionPageId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Page ID guardado' });
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSavingPageId(false);
    }
  };

  const handleCreateNotionDb = async () => {
    setCreatingDb(true);
    try {
      const res = await fetch('/api/notion/setup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Base de datos creada en Notion', description: `URL: ${data.url}` });
        fetchConfig();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setCreatingDb(false);
    }
  };

  const handleGenerate = async () => {
    if (!franja.trim() || !genero.trim()) {
      toast({ title: 'Completa los campos obligatorios', description: 'Nombre de franja y género son requeridos.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setGenerateError('');
    setResult(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franja,
          genero,
          duracion,
          cantidadPuentes,
          incluirPuentesLargos,
          cantidadPuentesLargos,
          playlist,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult(data);
        setResultTab('entradas');
        toast({ title: 'Libretos generados', description: `Paquete para "${data.franja}" listo.` });
      } else {
        setGenerateError(data.error || 'Error desconocido');
        toast({ title: 'Error al generar', description: data.error, variant: 'destructive' });
      }
    } catch {
      setGenerateError('Error de conexión con el servidor');
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToNotion = async () => {
    if (!result) return;
    setSavingNotion(true);
    try {
      const res = await fetch('/api/notion/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: result.generationId, franja: result.franja, genero: result.genero }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Guardado en Notion`, description: `${data.created} de ${data.total} libretos creados.` });
        if (data.errors) {
          console.warn('Notion errors:', data.errors);
        }
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSavingNotion(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: 'Copiado al portapapeles' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (expandedHistory === id) setExpandedHistory(null);
      toast({ title: 'Registro eliminado' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const duracionLabel = (d: string) => {
    const map: Record<string, string> = { '1h': '1 hora', '2h': '2 horas', '3h': '3 horas', '4h': '4+ horas' };
    return map[d] || d;
  };

  const tipoLabel = (t: string) => {
    const map: Record<string, string> = { ENTRADA: 'Entrada', PUENTE: 'Puente', PUENTE_LARGO: 'Puente Largo', SALIDA: 'Salida' };
    return map[t] || t;
  };

  const tipoColor = (t: string) => {
    const map: Record<string, string> = { ENTRADA: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30', PUENTE: 'bg-amber-600/20 text-amber-400 border-amber-600/30', PUENTE_LARGO: 'bg-orange-600/20 text-orange-400 border-orange-600/30', SALIDA: 'bg-sky-600/20 text-sky-400 border-sky-600/30' };
    return map[t] || 'bg-muted text-muted-foreground';
  };

  const totalPuentes = incluirPuentesLargos ? cantidadPuentes + cantidadPuentesLargos : cantidadPuentes;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center radio-glow">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                SisGelfram
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">v{appVersion}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {configStatus && (
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                  configStatus.provider === 'openrouter'
                    ? (configStatus.openRouterConfigured ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-red-900/30 text-red-400 border-red-700/40')
                    : (configStatus.geminiConfigured ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-red-900/30 text-red-400 border-red-700/40')
                }`}>
                  {configStatus.provider === 'openrouter'
                    ? (configStatus.openRouterConfigured ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />) 
                    : (configStatus.geminiConfigured ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />)}
                  {configStatus.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${configStatus.notionDbReady ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : configStatus.notionConfigured ? 'bg-amber-900/30 text-amber-400 border-amber-700/40' : 'bg-red-900/30 text-red-400 border-red-700/40'}`}>
                  {configStatus.notionDbReady ? <CheckCircle2 className="w-3 h-3" /> : configStatus.notionConfigured ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  Notion
                </span>
              </div>
            )}
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configuración</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Configuración
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  {/* Provider Selector */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-primary" />
                      Proveedor de IA
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProvider('openrouter')}
                        className={`flex flex-col items-center p-3 rounded-lg border text-center transition-colors ${
                          provider === 'openrouter'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50'
                        }`}
                      >
                        <p className="text-sm font-medium">OpenRouter</p>
                        <p className="text-xs opacity-70">Sin restricción de región</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProvider('google')}
                        className={`flex flex-col items-center p-3 rounded-lg border text-center transition-colors ${
                          provider === 'google'
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50'
                        }`}
                      >
                        <p className="text-sm font-medium">Google AI Studio</p>
                        <p className="text-xs opacity-70">Directo (puede tener restricciones)</p>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {provider === 'openrouter'
                        ? 'OpenRouter funciona desde cualquier país. Te conecta con Gemini sin restricciones.'
                        : 'Google AI Studio puede estar bloqueado según tu ubicación. Si da error 400, cambia a OpenRouter.'}
                    </p>
                  </div>

                  <Separator />

                  {/* API Key - conditional on provider */}
                  {provider === 'openrouter' ? (
                    <div className="space-y-2">
                      <Label htmlFor="openRouterKey" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        API Key de OpenRouter
                      </Label>
                      <Input
                        id="openRouterKey"
                        type="password"
                        placeholder="sk-or-v1-..."
                        value={openRouterKey}
                        onChange={(e) => setOpenRouterKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Crea una cuenta en{' '}
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          openrouter.ai/keys
                        </a>
                        {' '}— tiene crédito gratuito inicial y precios muy bajos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="geminiKey" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        API Key de Google AI Studio
                      </Label>
                      <Input
                        id="geminiKey"
                        type="password"
                        placeholder="AIzaSy..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Consíguela en{' '}
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          aistudio.google.com/apikey
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Gemini Model Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="geminiModel" className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Modelo de Gemini
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Más rápido, buen free tier' },
                        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Estable, amplio free tier' },
                        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Mayor disponibilidad free tier' },
                        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Mejor calidad, requiere pago' },
                      ].map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setGeminiModel(m.value)}
                          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                            geminiModel === m.value
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium">{m.label}</p>
                            <p className="text-xs opacity-70">{m.desc}</p>
                          </div>
                          {geminiModel === m.value && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Si un modelo da error 429, cambia a otro. El free tier varía por región.
                    </p>
                  </div>

                  <Separator />

                  {/* Notion Token */}
                  <div className="space-y-2">
                    <Label htmlFor="notionToken" className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      Token de Integración de Notion
                    </Label>
                    <Input
                      id="notionToken"
                      type="password"
                      placeholder="ntn_..."
                      value={notionToken}
                      onChange={(e) => setNotionToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Crea una integración en{' '}
                      <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        notion.so/my-integrations
                      </a>
                    </p>
                  </div>

                  {/* Notion Page ID */}
                  <div className="space-y-2">
                    <Label htmlFor="notionPageId">Page ID de Notion (padre)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="notionPageId"
                        placeholder="Pega aquí el ID de 32 caracteres..."
                        value={notionPageId}
                        onChange={(e) => setNotionPageId(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSavePageId}
                        disabled={savingPageId || !notionPageId.trim()}
                      >
                        {savingPageId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Abre la página en Notion, compártela con tu integración, y copia el ID de la URL (los 32 caracteres después del dominio).
                    </p>
                  </div>

                  {/* Create DB Button */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleCreateNotionDb}
                      disabled={creatingDb || !configStatus?.notionConfigured}
                    >
                      {creatingDb ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      Crear base de datos en Notion
                    </Button>
                    {configStatus?.notionDbReady && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Base de datos creada y lista
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Locutor / Locutora */}
                  <div className="space-y-2">
                    <Label htmlFor="locutorNombre" className="flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-primary" />
                      Nombre del Locutor / Locutora
                    </Label>
                    <Input
                      id="locutorNombre"
                      placeholder="Ej: Carlos Andrés, María José..."
                      value={locutorNombre}
                      onChange={(e) => setLocutorNombre(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se usará para personalizar saludos y despedidas en los libretos generados.
                    </p>
                  </div>

                  {/* Horario de la Franja */}
                  <div className="space-y-2">
                    <Label htmlFor="franjaHorario" className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-primary" />
                      Horario de la Franja
                    </Label>
                    <Input
                      id="franjaHorario"
                      placeholder="Ej: 6:00 AM a 10:00 AM, Lunes a Viernes"
                      value={franjaHorario}
                      onChange={(e) => setFranjaHorario(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se referencia en los libretos para hacerlos más cercanos al momento de emisión.
                    </p>
                  </div>

                  <Separator />

                  <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full">
                    {savingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Guardar configuración
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="generar" className="gap-2 flex-1 sm:flex-initial">
              <Mic2 className="w-4 h-4" />
              Generar
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-2 flex-1 sm:flex-initial">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* ====== TAB: GENERAR ====== */}
          <TabsContent value="generar">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Datos de la franja</CardTitle>
                  <CardDescription>Ingresa la información para generar el paquete de libretos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="franja">
                      Nombre de la franja <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="franja"
                      placeholder="Ej: Mañanas Campesinas"
                      value={franja}
                      onChange={(e) => setFranja(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genero">
                      Género(s) musical(es) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="genero"
                      placeholder="Ej: Vallenato, Cumbia, Porro"
                      value={genero}
                      onChange={(e) => setGenero(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duracion">Duración de la franja</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['1h', '2h', '3h', '4h'].map((d) => (
                        <Button
                          key={d}
                          variant={duracion === d ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setDuracion(d);
                            if (d === '1h') { setCantidadPuentes(2); setIncluirPuentesLargos(false); }
                            else if (d === '2h') { setCantidadPuentes(4); setIncluirPuentesLargos(false); }
                            else { setCantidadPuentes(5); setIncluirPuentesLargos(true); }
                          }}
                        >
                          {duracionLabel(d)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cantidadPuentes">
                      Cantidad de puentes: {cantidadPuentes}
                    </Label>
                    <Input
                      id="cantidadPuentes"
                      type="number"
                      min={1}
                      max={10}
                      value={cantidadPuentes}
                      onChange={(e) => setCantidadPuentes(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Para franjas de 1h: 2-3 puentes. Para 2h: 4-5. Para 3h+: 5-8.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="puentesLargos">Incluir puentes largos</Label>
                      <p className="text-xs text-muted-foreground">Para franjas de 2+ horas, varía la dinámica</p>
                    </div>
                    <Switch
                      id="puentesLargos"
                      checked={incluirPuentesLargos}
                      onCheckedChange={setIncluirPuentesLargos}
                    />
                  </div>

                  {incluirPuentesLargos && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                      <Label htmlFor="cantidadPuentesLargos">
                        Cantidad de puentes largos: {cantidadPuentesLargos}
                      </Label>
                      <Input
                        id="cantidadPuentesLargos"
                        type="number"
                        min={1}
                        max={5}
                        value={cantidadPuentesLargos}
                        onChange={(e) => setCantidadPuentesLargos(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                      />
                      <p className="text-xs text-muted-foreground">Puentes de 30-45 seg para variar en franjas largas.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="playlist">Playlist (opcional)</Label>
                    <Textarea
                      id="playlist"
                      placeholder={`Pega canciones y artistas aquí (opcional):\n1. Carlos Vives - La Gota Fría\n2. Diomedes Díaz - Bonita\n3. ...`}
                      value={playlist}
                      onChange={(e) => setPlaylist(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium">Paquete a generar:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">5 Entradas</Badge>
                      <Badge variant="outline" className="text-xs">{cantidadPuentes} Puentes</Badge>
                      {incluirPuentesLargos && (
                        <Badge variant="outline" className="text-xs">{cantidadPuentesLargos} Puentes largos</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">5 Salidas</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total: {10 + totalPuentes} libretos
                    </p>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !franja.trim() || !genero.trim()}
                    className="w-full gap-2 h-11"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando con Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generar paquete completo
                      </>
                    )}
                  </Button>

                  {generateError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {generateError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="lg:col-span-3">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {result ? `Paquete: ${result.franja}` : 'Resultados'}
                      </CardTitle>
                      {result && (
                        <CardDescription>
                          {result.genero} &middot; {new Date(result.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </CardDescription>
                      )}
                    </div>
                    {result && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToNotion}
                        disabled={savingNotion || !configStatus?.notionDbReady}
                        className="gap-2"
                      >
                        {savingNotion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span className="hidden sm:inline">Guardar en Notion</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!result && !generating && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <FileText className="w-12 h-12 mb-4 opacity-40" />
                      <p className="text-sm">Completa el formulario y genera tu primer paquete de libretos.</p>
                    </div>
                  )}

                  {generating && (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <p className="text-sm text-muted-foreground text-center pt-4">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Gemini está redactando los libretos...
                      </p>
                    </div>
                  )}

                  {result && !generating && (
                    <>
                      <Tabs value={resultTab} onValueChange={setResultTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
                          <TabsTrigger value="entradas" className="gap-1.5 text-xs sm:text-sm">
                            <Mic2 className="w-3.5 h-3.5" />
                            Entradas (5)
                          </TabsTrigger>
                          <TabsTrigger value="puentes" className="gap-1.5 text-xs sm:text-sm">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Puentes ({result.puentes.length})
                          </TabsTrigger>
                          {result.puentesLargos.length > 0 && (
                            <TabsTrigger value="puentesLargos" className="gap-1.5 text-xs sm:text-sm">
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              P. Largos ({result.puentesLargos.length})
                            </TabsTrigger>
                          )}
                          <TabsTrigger value="salidas" className="gap-1.5 text-xs sm:text-sm">
                            <LogOut className="w-3.5 h-3.5" />
                            Salidas (5)
                          </TabsTrigger>
                        </TabsList>

                        {['entradas', 'puentes', 'puentesLargos', 'salidas'].map((tipo) => {
                          if (tipo === 'puentesLargos' && result.puentesLargos.length === 0) return null;
                          const items = tipo === 'entradas' ? result.entradas
                            : tipo === 'puentes' ? result.puentes
                            : tipo === 'puentesLargos' ? result.puentesLargos
                            : result.salidas;
                          const tipoKey = tipo === 'puentes' ? 'PUENTE' : tipo === 'puentesLargos' ? 'PUENTE_LARGO' : tipo === 'entradas' ? 'ENTRADA' : 'SALIDA';

                          return (
                            <TabsContent key={tipo} value={tipo} className="mt-4">
                              <ScrollArea className="max-h-[60vh] scrollbar-thin pr-2">
                                <div className="space-y-3">
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="group relative bg-muted/40 border border-border/60 rounded-lg p-4 hover:border-primary/30 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant="outline" className={`text-xs border ${tipoColor(tipoKey)}`}>
                                            {tipoLabel(tipoKey)} #{item.numero}
                                          </Badge>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 p-0"
                                          onClick={() => handleCopy(item.contenido, item.id)}
                                        >
                                          {copiedId === item.id ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                                        {item.contenido}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ====== TAB: HISTORIAL ====== */}
          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Historial de generaciones
                </CardTitle>
                <CardDescription>Últimos paquetes generados. Despliega para ver los libretos.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory && (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                )}

                {!loadingHistory && history.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aún no hay generaciones.</p>
                  </div>
                )}

                {!loadingHistory && history.length > 0 && (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div key={item.id} className="border border-border/60 rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {expandedHistory === item.id ? (
                              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{item.franja}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.genero} &middot; {item.tipos} &middot;{' '}
                                {new Date(item.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistory(item.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </button>

                        {expandedHistory === item.id && (
                          <div className="border-t border-border/60 bg-muted/20 p-3 sm:p-4 max-h-96 overflow-y-auto scrollbar-thin">
                            <div className="space-y-3">
                              {item.libretos.map((lib) => (
                                <div key={lib.id} className="bg-muted/40 border border-border/40 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <Badge variant="outline" className={`text-xs border ${tipoColor(lib.tipo)}`}>
                                      {tipoLabel(lib.tipo)} #{lib.numero}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleCopy(lib.contenido, lib.id)}
                                    >
                                      {copiedId === lib.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                                    {lib.contenido}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>emisora digital Voces Campesinas &middot; www.vocecampesinas.co</p>
          <p>SisGelfram v{appVersion}</p>
        </div>
      </footer>
    </div>
  );
}