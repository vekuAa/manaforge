/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ScannedCard = {
  id: string;
  name: string;
  image?: string;
  confidence: number;
  quantity: number;
  price: number;
};

type CvLike = any;

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const cvRef = useRef<CvLike | null>(null);
  const animationRef = useRef<number | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const [scannedCards, setScannedCards] = useState<ScannedCard[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("Non classé");
  const [isScanning, setIsScanning] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState("Chargement du moteur de détection...");

  useEffect(() => {
    let cancelled = false;

    async function loadOpenCv() {
      try {
        const module = await import("@techstark/opencv-js");
        const cv = module.default || module;

        const ready = () => {
          if (cancelled) return;
          cvRef.current = cv;
          setStatus("Place une carte dans le cadre. Le contour blanc apparaît quand elle est détectée.");
          startDetectionLoop();
        };

        if (cv.Mat) {
          ready();
        } else {
          cv.onRuntimeInitialized = ready;
        }
      } catch {
        setStatus("OpenCV indisponible. Vérifie npm install @techstark/opencv-js.");
      }
    }

    void loadOpenCv();

    return () => {
      cancelled = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  function startDetectionLoop() {
    function loop() {
      detectCardContour();
      animationRef.current = requestAnimationFrame(loop);
    }

    animationRef.current = requestAnimationFrame(loop);
  }

  function detectCardContour() {
    const cv = cvRef.current;
    const video = webcamRef.current?.video;
    const canvas = overlayRef.current;

    if (!cv || !video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    let src;
    let gray;
    let blurred;
    let edges;
    let contours;
    let hierarchy;

    try {
      src = cv.imread(tempCanvas);
      gray = new cv.Mat();
      blurred = new cv.Mat();
      edges = new cv.Mat();
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();

      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 60, 160);
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let bestApprox = null;
      let bestArea = 0;

      for (let i = 0; i < contours.size(); i += 1) {
        const contour = contours.get(i);
        const perimeter = cv.arcLength(contour, true);
        const approx = new cv.Mat();

        cv.approxPolyDP(contour, approx, 0.03 * perimeter, true);

        if (approx.rows === 4) {
          const area = Math.abs(cv.contourArea(approx));
          const rect = cv.boundingRect(approx);
          const ratio = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);

          const looksLikeCard = ratio > 1.25 && ratio < 1.65;
          const isLargeEnough = area > video.videoWidth * video.videoHeight * 0.08;

          if (looksLikeCard && isLargeEnough && area > bestArea) {
            if (bestApprox) bestApprox.delete();
            bestApprox = approx;
            bestArea = area;
          } else {
            approx.delete();
          }
        } else {
          approx.delete();
        }

        contour.delete();
      }

      if (bestApprox) {
        drawDetectedContour(bestApprox, video, canvas, ctx);
        bestApprox.delete();
      }
    } catch {
      // On évite de casser la caméra si OpenCV rate une frame.
    } finally {
      src?.delete();
      gray?.delete();
      blurred?.delete();
      edges?.delete();
      contours?.delete();
      hierarchy?.delete();
    }
  }

  function drawDetectedContour(
    approx: CvLike,
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) {
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < approx.rows; i += 1) {
      points.push({
        x: approx.intPtr(i, 0)[0] * scaleX,
        y: approx.intPtr(i, 0)[1] * scaleY,
      });
    }

    if (points.length !== 4) return;

    ctx.lineWidth = 4;
    ctx.strokeStyle = "white";
    ctx.shadowColor = "rgba(245,158,11,0.85)";
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    points.slice(1).forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });

    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  function captureCurrentFrame() {
    const image = webcamRef.current?.getScreenshot();

    setIsScanning(true);
    setStatus("Carte capturée. Reconnaissance visuelle à brancher en V2.");

    window.setTimeout(() => {
      setScannedCards((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: "Carte à identifier",
          image: image || undefined,
          confidence: 0,
          quantity: 1,
          price: 0,
        },
      ]);

      setIsScanning(false);
    }, 500);
  }

  function removeCard(id: string) {
    setScannedCards((current) => current.filter((card) => card.id !== id));
  }

  async function addScannedCardsToCollection() {
    try {
      setIsAdding(true);

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setStatus("Connecte-toi pour ajouter les cartes.");
        return;
      }

      if (scannedCards.length === 0) return;

      const { data: folders } = await supabase
        .from("folders")
        .select("id,name")
        .eq("user_id", authData.user.id);

      const folderId =
        folders?.find((folder) => folder.name === selectedFolder)?.id || null;

      const cardsToInsert = scannedCards.map((card) => ({
        user_id: authData.user!.id,
        folder_id: folderId,
        scryfall_id: null,
        name: card.name,
        image: card.image || null,
        set_name: null,
        set_code: null,
        collector_number: null,
        language: "fr",
        foil: false,
        quantity: card.quantity,
        price: card.price,
      }));

      const { error } = await supabase.from("collection_cards").insert(cardsToInsert);

      if (error) {
        setStatus(error.message);
        return;
      }

      setScannedCards([]);
      setStatus(`Carte(s) ajoutée(s) au dossier ${selectedFolder}.`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <section className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_56%,rgba(0,0,0,0.72)_100%)]" />

        <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link
            href="/collection"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-2xl font-black backdrop-blur"
          >
            ←
          </Link>

          <div className="rounded-full bg-black/55 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            Scan live
          </div>

          <button
            type="button"
            onClick={() => {
              setScannedCards([]);
              setStatus("Liste vidée.");
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xs font-black backdrop-blur"
          >
            Reset
          </button>
        </header>

        <button
          type="button"
          onClick={captureCurrentFrame}
          disabled={isScanning}
          className="absolute bottom-[calc(32dvh+96px)] left-4 right-4 z-40 rounded-2xl bg-[#f59e0b] px-4 py-4 font-black text-black shadow-2xl disabled:opacity-50"
        >
          {isScanning ? "Capture..." : "Capturer la carte"}
        </button>

        <section className="absolute bottom-0 left-0 right-0 z-40 max-h-[38dvh] rounded-t-[2rem] border-t border-white/10 bg-[#101116]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f59e0b]">
                Détectées
              </p>
              <h2 className="mt-1 text-xl font-black">
                {scannedCards.length} carte(s)
              </h2>
            </div>

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              className="max-w-[145px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-black outline-none"
            >
              <option>Non classé</option>
              <option>Commander</option>
              <option>Trade</option>
              <option>Staples</option>
            </select>
          </div>

          <p className="mt-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/55">
            {status}
          </p>

          <div className="mt-3 max-h-[18dvh] overflow-y-auto pb-2">
            {scannedCards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center text-sm font-bold text-white/45">
                Place une carte devant la caméra : le contour blanc doit suivre la carte.
              </div>
            ) : (
              <div className="grid gap-2">
                {scannedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-2"
                  >
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-14 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-black/35 text-lg">
                        🎴
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{card.name}</p>
                      <p className="text-xs font-bold text-white/45">
                        Reconnaissance nom à brancher
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 font-black text-red-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={scannedCards.length === 0 || isAdding}
            onClick={() => void addScannedCardsToCollection()}
            className="mt-3 w-full rounded-2xl bg-white px-4 py-3 font-black text-black disabled:opacity-30"
          >
            {isAdding ? "Ajout..." : `Ajouter au dossier ${selectedFolder}`}
          </button>
        </section>
      </section>
    </main>
  );
}