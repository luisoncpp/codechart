// @Architecture(descriptionShort="Floating warning panel for unbound Diff Note markers dropped during parse")
import { useState } from "react";
import "./dropped-markers-warning.css";

interface DroppedMarkersWarningProps {
  text: string;
  onClose: () => void;
}

export function DroppedMarkersWarning({ text, onClose }: DroppedMarkersWarningProps) {
  const [copied, setCopied] = useState(/*initial=*/false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(/*copied=*/true);
      setTimeout(/*resetCopy=*/() => setCopied(/*copied=*/false), /*delayMs=*/2000);
    } catch {
      // clipboard access might be unavailable
    }
  };

  return (
    <div className="dropped-markers-warning" role="status" aria-label="Dropped Diff Markers">
      <div className="dropped-markers-warning__header">
        <span className="dropped-markers-warning__title">
          Unbound diff note markers dropped
        </span>
        <div className="dropped-markers-warning__actions">
          <button
            type="button"
            className="dropped-markers-warning__copy-btn"
            onClick={handleCopy}
            title="Copy dropped markers to clipboard"
            aria-label="Copy dropped markers"
          >
            {copied ? "Copied!" : "📋 Copy"}
          </button>
          <button
            type="button"
            className="dropped-markers-warning__close-btn"
            onClick={onClose}
            title="Close warning"
            aria-label="Close warning"
          >
            ✕
          </button>
        </div>
      </div>
      <pre className="dropped-markers-warning__text">{text}</pre>
    </div>
  );
}
