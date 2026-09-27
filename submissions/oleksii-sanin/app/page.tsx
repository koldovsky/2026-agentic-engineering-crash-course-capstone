import { Tool } from "./tool";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Markdown, four ways</h1>
      <p className="mt-2 max-w-2xl text-sm opacity-70">
        One markdown post in. Blog HTML, email HTML, an X thread and a LinkedIn post out. No
        account, and no copy on the server.
      </p>
      <Tool />
    </main>
  );
}
