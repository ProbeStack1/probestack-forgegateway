/**
 * TerminalAnimation — typewriter-style line reveal of an array of
 * shell commands. Inspired by the ForgeQ landing-page hero terminal
 * but kept dependency-free (no framer-motion).
 *
 * Each command appears with a `$` prompt, types one character at a
 * time, then the next line slides in. Once all lines are typed the
 * blinking caret stays on the last command. A "Restart" button lets
 * the user replay the animation.
 */
import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, RotateCcw, Copy, Check } from 'lucide-react';

const CHAR_DELAY = 22;     // ms per character
const LINE_PAUSE = 280;    // ms between lines

export default function TerminalAnimation({ commands, label = 'shell', onCopy }) {
  const [shown, setShown] = useState([]);            // array of fully-typed lines
  const [partial, setPartial] = useState('');        // currently-typing line
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);                 // bumped by Restart
  const [copied, setCopied] = useState(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let charTimer, lineTimer;
    setShown([]); setPartial(''); setDone(false);

    let lineIdx = 0;
    const typeLine = () => {
      if (cancelled || lineIdx >= commands.length) {
        if (!cancelled) setDone(true);
        return;
      }
      const cmd = commands[lineIdx];
      let charIdx = 0;
      const typeChar = () => {
        if (cancelled) return;
        charIdx++;
        setPartial(cmd.slice(0, charIdx));
        if (charIdx < cmd.length) charTimer = setTimeout(typeChar, CHAR_DELAY);
        else {
          setShown((prev) => [...prev, cmd]);
          setPartial('');
          lineIdx++;
          lineTimer = setTimeout(typeLine, LINE_PAUSE);
        }
      };
      typeChar();
    };
    typeLine();
    return () => { cancelled = true; clearTimeout(charTimer); clearTimeout(lineTimer); };
  }, [commands, run]);

  // Auto-scroll on every update so the latest line stays in view.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, partial]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(commands.join('\n'));
    setCopied(true); setTimeout(() => setCopied(false), 1600);
    onCopy?.();
  };

  return (
    <div className="rounded-lg border border-dark-700 overflow-hidden bg-[#0a0f1d]">
      <div className="px-3 py-1.5 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <TerminalIcon className="w-3.5 h-3.5 text-gray-400 ml-1" />
          <span className="text-[11px] text-gray-400 font-mono">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRun((r) => r + 1)} data-testid="terminal-restart"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-400 hover:text-[#ff5b1f]">
            <RotateCcw className="w-3 h-3" /> Replay
          </button>
          <button onClick={handleCopy} data-testid="terminal-copy"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-400 hover:text-[#ff5b1f]">
            {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="p-3 max-h-72 overflow-y-auto custom-scroll font-mono text-[12px] leading-relaxed">
        {shown.map((line, i) => (
          <div key={i} className="text-emerald-300">
            <span className="text-cyan-400 mr-2">$</span>{line}
          </div>
        ))}
        {partial && (
          <div className="text-emerald-300">
            <span className="text-cyan-400 mr-2">$</span>{partial}
            <span className="inline-block w-2 h-4 bg-emerald-300 align-middle ml-0.5 animate-pulse" />
          </div>
        )}
        {done && shown.length > 0 && (
          <div className="text-cyan-400 mt-1">
            $<span className="inline-block w-2 h-4 bg-cyan-300 align-middle ml-1 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
