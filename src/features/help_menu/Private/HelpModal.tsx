// @Architecture(descriptionShort="Modal dialog displaying rendered documentation with a Copy as Markdown button")
import { useEffect, useState } from "react";
import type { HelpTopic } from "./help-docs";
import { HelpMarkdownView } from "./HelpMarkdownView";
import {
  backdropStyle,
  bodyStyle,
  closeButtonStyle,
  copiedBtnStyle,
  copyBtnStyle,
  dismissButtonStyle,
  footerHintStyle,
  footerStyle,
  headerActionsStyle,
  headerStyle,
  panelStyle,
  titleStyle,
} from "./help-modal-styles";

interface HelpModalProps {
  topic: HelpTopic | null;
  onClose: () => void;
}

export function HelpModal({ topic, onClose }: HelpModalProps) {
  useEffect(/*closeOnEscape*/ () => {
    if (!topic) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [topic, onClose]);

  if (!topic) return null;

  return (
    <div style={backdropStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <HelpModalHeader topic={topic} onClose={onClose} />
        <div style={bodyStyle}>
          <HelpMarkdownView source={topic.markdown} />
        </div>
        <HelpModalFooter topic={topic} onClose={onClose} />
      </section>
    </div>
  );
}

interface SectionProps {
  topic: HelpTopic;
  onClose: () => void;
}

function HelpModalHeader({ topic, onClose }: SectionProps) {
  return (
    <header style={headerStyle}>
      <h2 id="help-modal-title" style={titleStyle}>
        {topic.title}
      </h2>
      <div style={headerActionsStyle}>
        <CopyMarkdownButton markdown={topic.markdown} />
        <button
          type="button"
          aria-label="Close"
          title="Close (Escape)"
          onClick={onClose}
          style={closeButtonStyle}
        >
          ✕
        </button>
      </div>
    </header>
  );
}

function HelpModalFooter({ topic, onClose }: SectionProps) {
  return (
    <footer style={footerStyle}>
      <span style={footerHintStyle}>
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <CopyMarkdownButton markdown={topic.markdown} />
        <button type="button" onClick={onClose} style={dismissButtonStyle}>
          Close
        </button>
      </div>
    </footer>
  );
}

function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(/*initial=*/ false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(/*copied=*/ true);
      setTimeout(
        /*resetCopied*/ () => setCopied(/*copied=*/ false),
        /*delayMs=*/ 2000,
      );
    } catch {
      // clipboard access might be unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy markdown text to clipboard"
      aria-label="Copy markdown explanation"
      style={copied ? copiedBtnStyle : copyBtnStyle}
    >
      {copied ? "✓ Copied!" : "📋 Copy as Markdown"}
    </button>
  );
}
