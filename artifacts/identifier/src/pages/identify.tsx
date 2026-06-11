import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { ImageUploader } from "@/components/image-uploader";
import { CameraCapture } from "@/components/camera-capture";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Globe, Tag, AlertCircle, Eye, Layers, Link2, ShieldAlert, Gem, ListTree, Camera, Scan, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PENDING_IMAGE_KEY = "identifly_pending_image";
const PENDING_MIME_KEY = "identifly_pending_mime";

type IdentifyResult = {
  name: string;
  description: string;
  category: string;
  subcategory?: string | null;
  confidence: number;
  tags: string[];
  facts: string[];
  attributes: { label: string; value: string }[];
  identifyingFeatures: string[];
  alternativeMatches: { name: string; confidence: number; reason?: string | null }[];
  relatedItems: string[];
  safetyNote?: string | null;
  estimatedValue?: string | null;
  origin?: string | null;
  scientificName?: string | null;
};

async function runIdentify(imageData: string, mimeType: string, scanToken: string): Promise<IdentifyResult> {
  const resp = await fetch("/api/identify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Scan-Token": scanToken,
    },
    body: JSON.stringify({ imageData, mimeType }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? "Identification failed");
  }
  return resp.json() as Promise<IdentifyResult>;
}

async function createCheckout(): Promise<string> {
  const resp = await fetch("/api/stripe/create-scan-checkout", { method: "POST" });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? "Failed to create checkout");
  }
  const data = await resp.json() as { url: string };
  return data.url;
}

async function verifyScan(sessionId: string): Promise<string> {
  const resp = await fetch(`/api/stripe/verify-scan?session_id=${encodeURIComponent(sessionId)}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? "Payment verification failed");
  }
  const data = await resp.json() as { token: string };
  return data.token;
}

type PageState =
  | { kind: "idle" }
  | { kind: "paywall"; imageData: string; mimeType: string; dataUrl: string }
  | { kind: "verifying" }
  | { kind: "analyzing"; imageData: string; mimeType: string; dataUrl: string }
  | { kind: "result"; imageData: string; mimeType: string; dataUrl: string; result: IdentifyResult }
  | { kind: "error"; imageData?: string; mimeType?: string; dataUrl?: string; message: string };

export default function IdentifyPage() {
  const [pageState, setPageState] = useState<PageState>({ kind: "idle" });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [, navigate] = useLocation();

  const checkoutMutation = useMutation({
    mutationFn: createCheckout,
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (err: Error) => {
      setPageState((s) =>
        s.kind === "paywall"
          ? { kind: "error", imageData: s.imageData, mimeType: s.mimeType, dataUrl: s.dataUrl, message: err.message }
          : { kind: "error", message: err.message }
      );
    },
  });

  const runAnalysis = useCallback(async (imageData: string, mimeType: string, dataUrl: string, scanToken: string) => {
    setPageState({ kind: "analyzing", imageData, mimeType, dataUrl });
    try {
      const result = await runIdentify(imageData, mimeType, scanToken);
      setPageState({ kind: "result", imageData, mimeType, dataUrl, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Identification failed";
      setPageState({ kind: "error", imageData, mimeType, dataUrl, message });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    navigate("/", { replace: true });

    const pendingImage = sessionStorage.getItem(PENDING_IMAGE_KEY);
    const pendingMime = sessionStorage.getItem(PENDING_MIME_KEY) ?? "image/jpeg";

    if (!pendingImage) {
      setPageState({ kind: "error", message: "Payment received, but no pending image found. Please upload your image again." });
      return;
    }

    const dataUrl = `data:${pendingMime};base64,${pendingImage}`;
    sessionStorage.removeItem(PENDING_IMAGE_KEY);
    sessionStorage.removeItem(PENDING_MIME_KEY);

    setPageState({ kind: "verifying" });

    verifyScan(sessionId)
      .then((token) => runAnalysis(pendingImage, pendingMime, dataUrl, token))
      .catch((err: Error) => {
        setPageState({ kind: "error", message: err.message });
      });
  }, [navigate, runAnalysis]);

  const handleImageSelected = (base64: string, mimeType: string) => {
    const dataUrl = `data:${mimeType};base64,${base64}`;
    setPageState({ kind: "paywall", imageData: base64, mimeType, dataUrl });
  };

  const handlePay = (imageData: string, mimeType: string) => {
    sessionStorage.setItem(PENDING_IMAGE_KEY, imageData);
    sessionStorage.setItem(PENDING_MIME_KEY, mimeType);
    checkoutMutation.mutate();
  };

  const handleReset = () => {
    sessionStorage.removeItem(PENDING_IMAGE_KEY);
    sessionStorage.removeItem(PENDING_MIME_KEY);
    setPageState({ kind: "idle" });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
            What are we looking at?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a photo of an animal, plant, object, or landmark. Our AI field guide will identify it for just $1.
          </p>
        </div>

        {pageState.kind === "idle" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ImageUploader onImageSelected={handleImageSelected} />

            <div className="max-w-md mx-auto mt-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                onClick={() => setCameraOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-border bg-card font-medium text-foreground hover:border-primary/50 hover:bg-muted/30 active:scale-[0.99] transition-all"
              >
                <Camera className="w-5 h-5 text-primary" />
                Take a photo
              </button>
            </div>
          </div>
        )}

        <CameraCapture
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCapture={(base64, mimeType) => {
            setCameraOpen(false);
            handleImageSelected(base64, mimeType);
          }}
        />

        {pageState.kind === "paywall" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-border bg-muted aspect-[4/3] md:aspect-auto md:h-[420px]">
                <img
                  src={pageState.dataUrl}
                  alt="Selected"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                    <Scan className="w-4 h-4" />
                    Ready to identify
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-foreground leading-tight">
                    Unlock your AI identification
                  </h2>
                  <p className="text-muted-foreground">
                    Our AI will analyze your image in detail — identifying the species, breed, model, or type with expert precision.
                  </p>
                </div>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Single Scan</span>
                      <span className="text-2xl font-bold text-foreground">$1.00</span>
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        Full identification with expert depth
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        Scientific name, origin, and key facts
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        Safety notes & estimated value when relevant
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <button
                  onClick={() => handlePay(pageState.imageData, pageState.mimeType)}
                  disabled={checkoutMutation.isPending}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Redirecting to payment…
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Pay $1.00 &amp; Identify
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Choose a different image
                </button>
              </div>
            </div>
          </div>
        )}

        {pageState.kind === "verifying" && (
          <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
            <div className="w-16 h-16 mb-6 relative">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="font-serif text-2xl font-bold text-foreground">Verifying payment…</h3>
            <p className="text-sm text-muted-foreground mt-2">Just a moment while we confirm your scan credit</p>
          </div>
        )}

        {pageState.kind === "analyzing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-in fade-in duration-500">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border bg-muted aspect-[4/3] md:aspect-auto md:h-[600px]">
              <img
                src={pageState.dataUrl}
                alt="Analyzing"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px]">
                <div className="w-16 h-16 mb-6 relative">
                  <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="font-serif text-2xl font-bold text-foreground drop-shadow-md">Analyzing subject...</h3>
                <p className="text-sm font-medium text-foreground/80 mt-2 bg-background/50 px-3 py-1 rounded-full backdrop-blur-md">Consulting the archives</p>
              </div>
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-primary/20 to-primary/40 animate-scan z-0 pointer-events-none"></div>
            </div>

            <div className="space-y-6">
              <div className="h-10 w-3/4 bg-muted rounded-lg animate-pulse"></div>
              <div className="h-6 w-1/3 bg-muted rounded-lg animate-pulse"></div>
              <div className="space-y-3 mt-8">
                <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-4/6 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {pageState.kind === "error" && (
          <div className="max-w-md mx-auto">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{pageState.message}</AlertDescription>
            </Alert>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {pageState.kind === "result" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start animate-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4 sticky top-24">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border bg-card aspect-[4/3] md:aspect-auto md:h-[500px]">
                <img
                  src={pageState.dataUrl}
                  alt={pageState.result.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <Card className="bg-card/50 backdrop-blur-sm shadow-sm border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1 w-full">
                    <div className="flex justify-between text-sm font-medium mb-1.5">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="text-foreground">{Math.round(pageState.result.confidence * 100)}%</span>
                    </div>
                    <Progress value={pageState.result.confidence * 100} className="h-2.5 bg-muted" />
                  </div>
                </CardContent>
              </Card>

              <button
                onClick={handleReset}
                className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors mt-4"
              >
                Identify something else
              </button>
            </div>

            <div className="space-y-8 pb-12">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/50 border-transparent px-3 py-1 text-xs uppercase tracking-wider font-bold">
                    {pageState.result.category}
                  </Badge>
                  {pageState.result.subcategory && (
                    <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/10 border-transparent px-3 py-1 text-xs uppercase tracking-wider font-bold">
                      {pageState.result.subcategory}
                    </Badge>
                  )}
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight mb-2">
                  {pageState.result.name}
                </h2>
                {pageState.result.scientificName && (
                  <p className="text-xl text-muted-foreground italic font-serif">
                    {pageState.result.scientificName}
                  </p>
                )}
              </div>

              {pageState.result.safetyNote && (
                <Alert className="border-accent/40 bg-accent/10">
                  <ShieldAlert className="h-4 w-4 text-accent-foreground" />
                  <AlertTitle className="text-foreground font-semibold">Safety &amp; Handling</AlertTitle>
                  <AlertDescription className="text-foreground/80">
                    {pageState.result.safetyNote}
                  </AlertDescription>
                </Alert>
              )}

              <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-lg">
                <p>{pageState.result.description}</p>
              </div>

              {pageState.result.attributes && pageState.result.attributes.length > 0 && (
                <Card className="border-border shadow-sm bg-card overflow-hidden">
                  <div className="bg-secondary/40 px-6 py-4 border-b border-border flex items-center gap-2">
                    <ListTree className="w-5 h-5 text-primary" />
                    <h3 className="font-serif font-semibold text-lg text-foreground">Key Characteristics</h3>
                  </div>
                  <CardContent className="p-0">
                    <dl className="divide-y divide-border">
                      {pageState.result.attributes.map((attr, i) => (
                        <div key={i} className="flex items-baseline gap-4 px-6 py-3">
                          <dt className="text-sm font-semibold text-muted-foreground uppercase tracking-wide w-1/3 shrink-0">{attr.label}</dt>
                          <dd className="text-sm font-medium text-foreground flex-1">{attr.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}

              {pageState.result.identifyingFeatures && pageState.result.identifyingFeatures.length > 0 && (
                <Card className="border-border shadow-sm bg-card overflow-hidden">
                  <div className="bg-secondary/40 px-6 py-4 border-b border-border flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <h3 className="font-serif font-semibold text-lg text-foreground">What We Saw</h3>
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {pageState.result.identifyingFeatures.map((feature, i) => (
                        <li key={i} className="flex gap-3 text-foreground/80">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {pageState.result.facts && pageState.result.facts.length > 0 && (
                <Card className="border-primary/20 shadow-md bg-card overflow-hidden">
                  <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-serif font-semibold text-lg text-foreground">Fascinating Facts</h3>
                  </div>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {pageState.result.facts.map((fact, i) => (
                        <li key={i} className="flex gap-3 text-foreground/80">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {pageState.result.alternativeMatches && pageState.result.alternativeMatches.length > 0 && (
                <Card className="border-border shadow-sm bg-card overflow-hidden">
                  <div className="bg-secondary/40 px-6 py-4 border-b border-border flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="font-serif font-semibold text-lg text-foreground">Could Also Be</h3>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {pageState.result.alternativeMatches.map((alt, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-foreground">{alt.name}</span>
                          <span className="text-sm font-semibold text-muted-foreground shrink-0">{Math.round(alt.confidence * 100)}%</span>
                        </div>
                        <Progress value={alt.confidence * 100} className="h-1.5 bg-muted" />
                        {alt.reason && <p className="text-sm text-muted-foreground">{alt.reason}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pageState.result.origin && (
                  <Card className="bg-muted/30 border-border/50 shadow-none">
                    <CardContent className="p-4 flex gap-3">
                      <div className="bg-background p-2 rounded-lg shrink-0 h-fit">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Origin</p>
                        <p className="text-sm font-medium text-foreground">{pageState.result.origin}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {pageState.result.estimatedValue && (
                  <Card className="bg-muted/30 border-border/50 shadow-none">
                    <CardContent className="p-4 flex gap-3">
                      <div className="bg-background p-2 rounded-lg shrink-0 h-fit">
                        <Gem className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Est. Value</p>
                        <p className="text-sm font-medium text-foreground">{pageState.result.estimatedValue}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {pageState.result.relatedItems && pageState.result.relatedItems.length > 0 && (
                  <Card className="bg-muted/30 border-border/50 shadow-none sm:col-span-2">
                    <CardContent className="p-4 flex gap-3">
                      <div className="bg-background p-2 rounded-lg shrink-0 h-fit">
                        <Link2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="w-full">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Related</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pageState.result.relatedItems.map((item) => (
                            <span key={item} className="text-xs px-2 py-0.5 bg-background border border-border rounded-md text-foreground">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-muted/30 border-border/50 shadow-none sm:col-span-2">
                  <CardContent className="p-4 flex gap-3">
                    <div className="bg-background p-2 rounded-lg shrink-0 h-fit">
                      <Tag className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="w-full">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pageState.result.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-background border border-border rounded-md text-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
