/**
 * Runs `html` synchronously while the browser parses the HTML, i.e. before the first paint
 * (Next 16 guide: app/guides/preventing-flash-before-hydration).
 *
 * On the client the script is inert (`text/plain`): React does not execute scripts it inserts
 * through DOM updates anyway, and the type swap avoids the development warning about rendering
 * `<script>` tags. `suppressHydrationWarning` covers the type mismatch.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
