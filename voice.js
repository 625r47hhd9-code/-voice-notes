import React from "https://esm.sh/react@19.1.1";

const { useCallback, useEffect, useRef, useState } = React;

export function useVoiceRecognition({ onCommit }) {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const stoppingRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");

  const displayText = (finalText + (finalText && interimText ? " " : "") + interimText).trim();

  const reset = useCallback(() => {
    setListening(false);
    setFinalText("");
    setInterimText("");
    finalRef.current = "";
    interimRef.current = "";
    stoppingRef.current = false;
    recRef.current = null;
  }, []);

  const commitCurrent = useCallback(() => {
    const text = (finalRef.current + (finalRef.current && interimRef.current ? " " : "") + interimRef.current).trim();
    reset();
    if (text) onCommit(text);
  }, [onCommit, reset]);

  const startOne = useCallback(() => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) {
      setError("Распознавание речи недоступно в этом браузере");
      return;
    }

    const rec = new R();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onresult = e => {
      let interim = "";
      let finalPart = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0]?.transcript?.trim() || "";
        if (e.results[i].isFinal) {
          if (txt) finalPart += (finalPart ? " " : "") + txt;
        } else {
          interim = txt;
        }
      }
      if (finalPart) {
        finalRef.current += (finalRef.current ? " " : "") + finalPart;
        setFinalText(finalRef.current);
      }
      interimRef.current = interim;
      setInterimText(interim);
    };

    rec.onerror = e => {
      if (e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Разрешите микрофон для этого сайта");
        reset();
      } else if (e.error === "audio-capture") {
        setError("Микрофон недоступен");
        reset();
      }
    };

    rec.onend = () => {
      if (stoppingRef.current) {
        commitCurrent();
        return;
      }
      if (recRef.current && !stoppingRef.current) {
        setTimeout(() => {
          if (recRef.current && !stoppingRef.current) {
            try { startOne(); } catch {}
          }
        }, 120);
      }
    };

    try { rec.start(); } catch {}
  }, [commitCurrent, reset]);

  const start = useCallback(() => {
    if (listening) return;
    setError("");
    setFinalText("");
    setInterimText("");
    finalRef.current = "";
    interimRef.current = "";
    stoppingRef.current = false;
    setListening(true);
    startOne();
  }, [listening, startOne]);

  const stop = useCallback((commit = true) => {
    if (!listening && !recRef.current) return;
    stoppingRef.current = true;
    setListening(false);
    const rec = recRef.current;

    if (!commit) {
      finalRef.current = "";
      interimRef.current = "";
    }

    if (!rec) {
      commit ? commitCurrent() : reset();
      return;
    }

    try {
      rec.onend = () => commit ? commitCurrent() : reset();
      commit ? rec.stop() : rec.abort();
    } catch {
      commit ? commitCurrent() : reset();
    }

    setTimeout(() => {
      if (stoppingRef.current) commit ? commitCurrent() : reset();
    }, 700);
  }, [commitCurrent, listening, reset]);

  const toggle = useCallback(() => listening ? stop(true) : start(), [listening, start, stop]);

  const deleteLastWord = useCallback(() => {
    if (interimRef.current.trim()) {
      const parts = interimRef.current.trim().split(/\s+/);
      parts.pop();
      interimRef.current = parts.join(" ");
      setInterimText(interimRef.current);
    } else {
      const parts = finalRef.current.trim().split(/\s+/);
      parts.pop();
      finalRef.current = parts.join(" ");
      setFinalText(finalRef.current);
    }
  }, []);

  useEffect(() => () => {
    try { recRef.current?.abort(); } catch {}
  }, []);

  return { listening, displayText, error, toggle, stop, deleteLastWord };
}
