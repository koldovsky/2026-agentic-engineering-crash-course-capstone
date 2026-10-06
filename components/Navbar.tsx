const links = [
  { href: "#features", label: "Можливості" },
  { href: "#how-it-works", label: "Як це працює" },
  { href: "#pricing", label: "Тарифи" },
  { href: "#faq", label: "Питання" },
  { href: "#waitlist", label: "Список очікування" },
];

export function Navbar() {
  return (
    <header id="navbar" className="border-b border-zinc-200 dark:border-zinc-800">
      <nav
        aria-label="Основна навігація"
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4"
      >
        <a href="#hero" className="text-xl font-bold">
          AgentFlow
        </a>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="hover:underline">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
