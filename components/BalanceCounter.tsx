import { useEffect, useRef, useState } from "react";
import { LANGUAGE_KEY } from "@/lib/game/preferences";
import { CURRENT_SAVE_VERSION, SAVE_KEY } from "@/lib/game/save";
import { formatNumber } from "@/lib/i18n";
import { InlineScript } from "./InlineScript";
import { usePreferences } from "./PreferencesProvider";

interface BalanceCounterProps {
  readonly balance: number;
  /** Hidden (but still taking up space) until the first click, so the button never jumps (D7). */
  readonly visible: boolean;
  /** True once the saved state has been read from storage; gates the bump animation (design D11). */
  readonly loaded: boolean;
}

// Paints the saved balance while the HTML is parsed, before React hydrates; without it the
// counter would show 0 until hydration. Duplicates the envelope rules of lib/game/save.ts and
// the formatting of lib/i18n on purpose — an import could not run blocking (design D8). The
// storage keys and save version are interpolated from the same constants lib/game/save.ts and
// lib/game/preferences.ts export, so the two copies cannot drift apart. Every save version carries
// balance and totalClicks, so older saves are painted too (they are migrated during hydration).
const PRE_PAINT_BALANCE = `{try{
var el=document.querySelector('[data-testid="balance"]');
var raw=el&&localStorage.getItem(${JSON.stringify(SAVE_KEY)});
var file=raw?JSON.parse(raw):null;
var ver=file&&file.version;
var s=(typeof ver==="number"&&ver>=1&&ver<=${JSON.stringify(CURRENT_SAVE_VERSION)})&&file.state?file.state:null;
var ok=s&&Number.isSafeInteger(s.balance)&&s.balance>=0&&Number.isSafeInteger(s.totalClicks)&&s.totalClicks>=0;
if(ok){
var l=localStorage.getItem(${JSON.stringify(LANGUAGE_KEY)});
l=l==="uk"||l==="en"?l:"uk";
var text=new Intl.NumberFormat(l).format(s.balance);
el.textContent=l==="uk"?text.replace(/[\\s\\u202f]/g,"\\u00a0"):text;
el.style.visibility=s.totalClicks>0?"visible":"hidden";
}}catch(e){}}`;

export function BalanceCounter({ balance, visible, loaded }: BalanceCounterProps) {
  const { language, t } = usePreferences();
  const formatted = formatNumber(balance, language);

  // The bump animation (design D11) should only play for balance changes the user causes after
  // the page is interactive, not for the hydration correction that replaces the pre-paint value
  // (or the SSR placeholder) with the real saved balance. `bumpKey` only advances once the saved
  // state was already loaded on the previous render and the balance actually changed.
  const prevLoadedRef = useRef(false);
  const prevBalanceRef = useRef(balance);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    if (prevLoadedRef.current && prevBalanceRef.current !== balance) {
      setBumpKey((key) => key + 1);
    }
    prevLoadedRef.current = loaded;
    prevBalanceRef.current = balance;
  }, [balance, loaded]);

  return (
    <div
      // The fixed-height wrapper is what decor placement reserves (design D10).
      data-testid="balance-area"
      className="flex h-16 items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={t("balance.ariaLabel", { value: formatted })}
    >
      <span
        // A new key restarts the bump animation, but only on post-load changes (see above).
        key={bumpKey}
        data-testid="balance"
        style={{ visibility: visible ? "visible" : "hidden" }}
        // The inline script below rewrites this element before hydration; keep the DOM value.
        suppressHydrationWarning
        className="balance-bump text-5xl font-bold tabular-nums"
      >
        {formatted}
      </span>
      <InlineScript html={PRE_PAINT_BALANCE} />
    </div>
  );
}
