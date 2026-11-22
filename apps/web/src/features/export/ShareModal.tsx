import { CheckCircle, Copy, Download, Mail, Send, Share2, X } from "lucide-react";
import { useState } from "react";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.41-1.42a9.86 9.86 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.07c-.24.68-1.4 1.3-1.93 1.38-.49.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94 0-1.4.73-2.09.99-2.37.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.17.01.41-.07.64.49.24.58.81 2 .88 2.15.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.93 1.93 1.22 2.21 1.36.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.32.07.12.07.65-.17 1.33Z" />
    </svg>
  );
}

/** Teilen wie V2: WhatsApp, Telegram, E-Mail, Kopieren, natives Teilen (mit Fotos). */
export function ShareModal({
  text,
  loadPhotos,
  onClose,
}: {
  text: string;
  loadPhotos: () => Promise<File[]>;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const encoded = encodeURIComponent(text);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encoded}`, icon: <WhatsAppIcon />, color: "#25D366" },
    { label: "Telegram", href: `https://t.me/share/url?url=&text=${encoded}`, icon: <Send className="h-5 w-5" />, color: "#229ED9" },
    {
      label: "E-Mail",
      href: `mailto:?subject=${encodeURIComponent("Sm@rtCraft Analyse")}&body=${encoded}`,
      icon: <Mail className="h-5 w-5" />,
      color: "#4b5563",
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar
    }
  }

  async function nativeShare() {
    try {
      const data: ShareData = { title: "Sm@rtCraft Analyse", text };
      const files = await loadPhotos().catch(() => []);
      if (files.length && navigator.canShare?.({ files })) data.files = files;
      await navigator.share(data);
    } catch {
      // abgebrochen
    }
  }

  async function downloadPhotos() {
    const files = await loadPhotos().catch(() => []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    setDownloaded(files.length > 0);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Analyse teilen">
      <div className="panel-parchment w-full max-w-sm space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Share2 className="h-5 w-5 text-(--accent)" aria-hidden="true" />
            Analyse teilen
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {canNativeShare && (
          <button type="button" onClick={() => void nativeShare()} className="btn-accent flex w-full items-center justify-center gap-2 py-3">
            <Share2 className="h-5 w-5" aria-hidden="true" />
            Teilen über …
          </button>
        )}
        <div className="grid grid-cols-3 gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-bold text-white shadow-md active:scale-[0.98]"
              style={{ backgroundColor: l.color }}
            >
              {l.icon}
              {l.label}
            </a>
          ))}
        </div>
        <button type="button" onClick={() => void copy()} className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5">
          {copied ? <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Kopiert!" : "Text kopieren"}
        </button>
        <button type="button" onClick={() => void downloadPhotos()} className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm">
          <Download className="h-4 w-4" aria-hidden="true" />
          {downloaded ? "Fotos heruntergeladen" : "Fotos zum Anhängen herunterladen"}
        </button>
        <p className="text-[11px] text-gray-500">
          WhatsApp, Telegram und E-Mail übernehmen nur den Text – Fotos bitte manuell anhängen.
        </p>
      </div>
    </div>
  );
}
