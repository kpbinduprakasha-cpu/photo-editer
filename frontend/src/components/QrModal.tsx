import React, { useState } from 'react';
import { QrCode, Smartphone, Wifi, Globe, X, Copy, Check, ExternalLink } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl: string;
  localWifiUrl: string;
  tunnelPassword?: string;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  publicUrl,
  localWifiUrl,
  tunnelPassword = '152.57.50.187',
}) => {
  const [activeTab, setActiveTab] = useState<'public' | 'wifi'>('public');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = activeTab === 'public' ? publicUrl : localWifiUrl;
  const qrImageSrc =
    activeTab === 'public' ? '/qr_public_tunnel.png' : '/qr_wifi.png';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#12141c] text-zinc-100 max-w-md w-full rounded-2xl border border-orange-500/40 shadow-2xl shadow-orange-500/10 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Scan for Mobile View</h2>
              <p className="text-xs text-zinc-400">Point phone camera at screen to open</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Public URL (Worldwide) vs Wi-Fi URL (Fast) */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('public')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                activeTab === 'public'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe size={14} />
              <span>Public Mobile URL</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wifi')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                activeTab === 'wifi'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wifi size={14} />
              <span>Same Wi-Fi Direct</span>
            </button>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-5 flex flex-col items-center text-center">
          <div className="p-3 bg-white rounded-2xl shadow-2xl border border-zinc-700/80 mb-4 animate-in zoom-in-95">
            <img
              src={qrImageSrc}
              alt="Scan for Mobile View QR Code"
              className="w-56 h-56 object-contain"
            />
          </div>

          <div className="space-y-2 w-full max-w-sm">
            {activeTab === 'public' ? (
              <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>If asked for tunnel password:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(tunnelPassword, 'pwd')}
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-mono font-bold"
                  >
                    <span>{tunnelPassword}</span>
                    {copied === 'pwd' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Works on any phone data or network anywhere in the world!
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
                <div>⚡ Ultra-fast direct streaming over local Wi-Fi.</div>
                <div className="text-[11px] text-zinc-500">
                  Make sure your mobile phone is connected to the same Wi-Fi router.
                </div>
              </div>
            )}

            {/* Clickable Link / Copy Button */}
            <div className="flex items-center justify-between p-2.5 bg-[#181a24] rounded-xl border border-zinc-800 text-xs">
              <span className="font-mono text-zinc-300 truncate max-w-[240px]">
                {currentUrl}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(currentUrl, 'url')}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                  title="Copy Link"
                >
                  {copied === 'url' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-zinc-800"
                  title="Open Link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Smartphone size={14} className="text-orange-400" />
            <span>Open camera app & scan</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-1 px-3 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
