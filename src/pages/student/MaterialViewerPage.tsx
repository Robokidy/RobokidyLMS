import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { API_BASE, apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import type { Material } from "@/types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function PdfCanvasPage({ pdfDoc, pageNumber }: { pdfDoc: any; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | undefined;

    const renderPage = async () => {
      const canvas = canvasRef.current;
      const shell = shellRef.current;
      if (!canvas || !shell) return;

      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(320, shell.clientWidth - 32);
      const scale = Math.min(2, availableWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, viewport.width, viewport.height);
      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise.catch(() => undefined);
    };

    renderPage();
    const observer = new ResizeObserver(() => renderPage());
    if (shellRef.current) observer.observe(shellRef.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div ref={shellRef} className="flex w-full justify-center px-4 py-4">
      <canvas
        ref={canvasRef}
        className="max-w-full bg-white shadow-lg"
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  );
}

function PdfCanvasViewer({ fileUrl }: { fileUrl: string }) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });

    loadingTask.promise
      .then((doc) => {
        if (cancelled) {
          doc.destroy();
          return;
        }
        setPdfDoc(doc);
        setPageCount(doc.numPages);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Unable to render this PDF in the protected viewer.");
      });

    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [fileUrl]);

  if (loadError) {
    return <div className="p-6 text-center font-semibold text-red-700">{loadError}</div>;
  }

  if (!pdfDoc) {
    return <div className="p-6 text-center font-semibold text-slate-700">Rendering protected PDF...</div>;
  }

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-slate-200 py-4">
      {Array.from({ length: pageCount }, (_, index) => (
        <PdfCanvasPage key={index + 1} pdfDoc={pdfDoc} pageNumber={index + 1} />
      ))}
    </div>
  );
}

export default function MaterialViewerPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [secureFileUrl, setSecureFileUrl] = useState("");
  const [error, setError] = useState("");
  const [screenGuard, setScreenGuard] = useState(false);

  useEffect(() => {
    if (!id) return;
    let objectUrl = "";

    const role = user?.role || "student";
    const materialEndpoint = role === "student" ? `/student/materials/${id}` : `/materials/${id}`;

    apiFetch(materialEndpoint, {}, token)
      .then(async (data) => {
        setMaterial(data);
        const filePath = String(data.fileUrl || "").replace(/^\/api/, "");
        const res = await fetch(`${API_BASE}${filePath}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Unable to open protected file");
        objectUrl = URL.createObjectURL(await res.blob());
        setSecureFileUrl(objectUrl);
      })
      .catch((err) => setError(err.message));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setSecureFileUrl("");
    };
  }, [id, token, user?.role]);

  useEffect(() => {
    window.sessionStorage.setItem("secureViewerActive", "1");
    let guardTimer: number | undefined;
    let clipboardTimer: number | undefined;
    const blockEvent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const clearClipboard = () => {
      navigator.clipboard?.writeText("").catch(() => undefined);
    };
    const flashGuard = (duration = 1800) => {
      setScreenGuard(true);
      if (guardTimer) window.clearTimeout(guardTimer);
      guardTimer = window.setTimeout(() => setScreenGuard(false), duration);
    };
    const handleCaptureAttempt = (event?: Event) => {
      event?.preventDefault();
      event?.stopPropagation();
      flashGuard(5000);
      clearClipboard();
      if (clipboardTimer) window.clearInterval(clipboardTimer);
      let attempts = 0;
      clipboardTimer = window.setInterval(() => {
        clearClipboard();
        attempts += 1;
        if (attempts >= 10 && clipboardTimer) {
          window.clearInterval(clipboardTimer);
          clipboardTimer = undefined;
        }
      }, 200);
    };
    const blockKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedCtrlKeys = [
        "a",
        "c",
        "e",
        "f",
        "g",
        "i",
        "j",
        "n",
        "o",
        "p",
        "r",
        "s",
        "u",
        "v",
        "x",
        "y",
        "z",
        "+",
        "-",
        "=",
        "0"
      ];
      const functionKey = /^f\d{1,2}$/.test(key);
      const blockedCombo =
        (event.ctrlKey || event.metaKey) ||
        event.altKey ||
        functionKey ||
        key === "printscreen" ||
        key === "contextmenu";

      if (key === "printscreen") {
        handleCaptureAttempt(event);
        return;
      }

      if (blockedCombo && (blockedCtrlKeys.includes(key) || event.ctrlKey || event.metaKey || event.altKey || functionKey || key === "printscreen" || key === "contextmenu")) {
        event.preventDefault();
        event.stopPropagation();
        flashGuard();
        if (["c", "v", "x", "a", "s", "p", "u", "i", "j"].includes(key)) {
          clearClipboard();
        }
      }
    };
    const guardVisibility = () => {
      if (document.hidden) setScreenGuard(true);
    };
    const revealOnFocus = () => window.setTimeout(() => setScreenGuard(false), 500);

    document.addEventListener("contextmenu", blockEvent, true);
    document.addEventListener("copy", blockEvent, true);
    document.addEventListener("cut", blockEvent, true);
    document.addEventListener("paste", blockEvent, true);
    document.addEventListener("selectstart", blockEvent, true);
    document.addEventListener("dragstart", blockEvent, true);
    document.addEventListener("drop", blockEvent, true);
    document.addEventListener("keydown", blockKeys, true);
    document.addEventListener("keyup", blockKeys, true);
    window.addEventListener("blur", flashGuard, true);
    window.addEventListener("beforeprint", handleCaptureAttempt, true);
    window.addEventListener("focus", revealOnFocus, true);
    document.addEventListener("visibilitychange", guardVisibility, true);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    return () => {
      window.sessionStorage.removeItem("secureViewerActive");
      document.removeEventListener("contextmenu", blockEvent, true);
      document.removeEventListener("copy", blockEvent, true);
      document.removeEventListener("cut", blockEvent, true);
      document.removeEventListener("paste", blockEvent, true);
      document.removeEventListener("selectstart", blockEvent, true);
      document.removeEventListener("dragstart", blockEvent, true);
      document.removeEventListener("drop", blockEvent, true);
      document.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("keyup", blockKeys, true);
      window.removeEventListener("blur", flashGuard, true);
      window.removeEventListener("beforeprint", handleCaptureAttempt, true);
      window.removeEventListener("focus", revealOnFocus, true);
      document.removeEventListener("visibilitychange", guardVisibility, true);
      if (guardTimer) window.clearTimeout(guardTimer);
      if (clipboardTimer) window.clearInterval(clipboardTimer);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const watermark = material?.viewer?.watermark || `${user?.username || "user"} | protected`;
  const backPath = user?.role === "admin" ? "/admin/materials" : user?.role === "cto" ? "/cto/materials" : user?.role === "teacher" ? "/teacher/materials" : "/student/materials";
  const blockPointerEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-white secure-material-viewer"
      onContextMenu={blockPointerEvent}
      onCopy={blockPointerEvent}
      onCut={blockPointerEvent}
      onPaste={blockPointerEvent}
      onDragStart={blockPointerEvent}
    >
      <header className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="outline" size="sm" className="bg-transparent text-white border-white/20 hover:bg-white/10">
            <Link to={backPath}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{material?.title || "Secure Viewer"}</h1>
            <p className="text-xs text-slate-300 truncate">{material?.courseId?.name || "Protected material"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Shield className="h-4 w-4 text-emerald-400" />
          Protected session
        </div>
      </header>

      <main className="relative h-[calc(100vh-4rem)] overflow-hidden" onContextMenu={blockPointerEvent}>
        {error && <div className="p-6 text-red-200">{error}</div>}
        {!material && !error && <div className="p-6 text-slate-300">Loading secure material...</div>}
        {screenGuard && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950 text-center text-white">
            <div>
              <Shield className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-lg font-semibold">Screen capture is restricted</p>
            </div>
          </div>
        )}
        {material && secureFileUrl && (
          <>
            <div className="absolute inset-0 z-20 pointer-events-none opacity-20 grid grid-cols-2 md:grid-cols-4 gap-8 rotate-[-18deg] text-sm md:text-base font-semibold text-white">
              {Array.from({ length: 32 }).map((_, index) => (
                <div key={index} className="flex items-center justify-center whitespace-nowrap">{watermark}</div>
              ))}
            </div>
            <div className="absolute left-4 bottom-4 z-30 rounded bg-black/70 px-3 py-2 text-xs text-slate-200">
              Download, print, copy, right-click, and common save shortcuts are blocked in this viewer.
            </div>
            {material.type === "video" ? (
              <video
                className="h-full w-full bg-black"
                src={secureFileUrl}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
              />
            ) : material.mimeType === "application/pdf" ? (
              <div
                className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-white"
                onContextMenu={blockPointerEvent}
              >
                <PdfCanvasViewer fileUrl={secureFileUrl} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-white p-6 text-center text-slate-700">
                <div>
                  <p className="font-semibold">Preview unavailable</p>
                  <p className="mt-2 text-sm">Please ask the admin to upload this material as a PDF or video for protected in-app viewing.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
        }
        .secure-material-viewer,
        .secure-material-viewer * {
          -webkit-touch-callout: none !important;
          -webkit-user-drag: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
      `}</style>
    </div>
  );
}
