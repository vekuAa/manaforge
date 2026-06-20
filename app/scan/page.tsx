/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Webcam from "react-webcam";
import { useRef, useState } from "react";
import { Camera, Layers, X } from "lucide-react";

export default function ScanPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const [lastImage, setLastImage] = useState("");
  const [status, setStatus] = useState("Place une carte dans le cadre.");

  function capturePreview() {
    const image = webcamRef.current?.getScreenshot();

    if (!image) {
      setStatus("Impossible de capturer l’image.");
      return;
    }

    setLastImage(image);
    setStatus("Carte capturée. Reconnaissance à améliorer.");
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <section className="relative mx-auto h-dvh max-w-md overflow-hidden bg-black">
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

        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/90" />

        <header className="absolute left-0 right-0 top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center justify-between rounded-3xl bg-black/45 p-2 backdrop-blur-xl">
            <Link
              href="/collection"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"
            >
              <X size={22} />
            </Link>

            <div className="text-center">
              <p className="text-xs font-black text-[#f59e0b]">ManaForge</p>
              <p className="text-sm font-black">Scan Collection</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Layers size={19} />
            </div>
          </div>
        </header>

        <div className="pointer-events-none absolute left-1/2 top-[43%] z-20 aspect-[63/88] w-[74%] max-w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-[1.8rem] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]">
          <span className="absolute -left-1.5 -top-1.5 h-14 w-14 rounded-tl-[1.8rem] border-l-4 border-t-4 border-white" />
          <span className="absolute -right-1.5 -top-1.5 h-14 w-14 rounded-tr-[1.8rem] border-r-4 border-t-4 border-white" />
          <span className="absolute -bottom-1.5 -left-1.5 h-14 w-14 rounded-bl-[1.8rem] border-b-4 border-l-4 border-white" />
          <span className="absolute -bottom-1.5 -right-1.5 h-14 w-14 rounded-br-[1.8rem] border-b-4 border-r-4 border-white" />
        </div>

        <div className="absolute bottom-36 left-0 right-0 z-40 flex justify-center">
          <button
            type="button"
            onClick={capturePreview}
            className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white bg-white text-black shadow-2xl active:scale-95"
          >
            <Camera size={30} />
          </button>
        </div>

        <section className="absolute bottom-0 left-0 right-0 z-40 rounded-t-[2rem] bg-[#101116]/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
          {lastImage ? (
            <div className="flex items-center gap-3">
              <img
                src={lastImage}
                alt="Carte capturée"
                className="h-20 w-14 rounded-xl object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">Carte capturée</p>
                <p className="text-sm font-bold text-white/45">{status}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.055] p-4 text-center">
              <p className="text-sm font-bold text-white/55">{status}</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}