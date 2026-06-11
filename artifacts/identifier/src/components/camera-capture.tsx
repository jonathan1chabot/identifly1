import { useState, useRef, useEffect, useCallback } from "react";
import { X, Aperture, AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (base64: string, mimeType: string) => void;
}

export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setReady(false);

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(
            "Camera permission was denied. Allow camera access and try again. If you are in the preview pane, open the app in a new browser tab.",
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera was found on this device.");
        } else {
          setError("Could not start the camera. Try uploading an image instead.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];

    stopStream();
    onCapture(base64, "image/jpeg");
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
      <button
        onClick={handleClose}
        aria-label="Close camera"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {error ? (
        <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="font-serif text-xl font-bold text-foreground mb-2">
            Camera unavailable
          </h3>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </div>
      ) : (
        <>
          <div className="relative w-full max-w-2xl aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/80">
                <div className="w-12 h-12 relative">
                  <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin" />
                </div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Starting camera...
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={handleCapture}
              disabled={!ready}
              aria-label="Take photo"
              className="group flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold shadow-lg hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <Aperture className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              Take Photo
            </button>
          </div>

          <p className="mt-4 text-sm text-white/60">
            Point your camera at the subject and capture it to identify.
          </p>
        </>
      )}
    </div>
  );
}
