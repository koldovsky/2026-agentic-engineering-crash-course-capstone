export function Hero() {
  return (
    <section id="hero" aria-labelledby="hero-title" className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <h1 id="hero-title" className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        Розробка з ШІ-агентами за специфікацією
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
        AgentFlow допомагає команді поставити задачу, реалізувати її відповідно до специфікації та
        перевірити результат.
      </p>
      <a
        href="#waitlist"
        className="mt-8 inline-block rounded-md bg-foreground px-6 py-3 font-medium text-background"
      >
        Приєднатися до списку очікування
      </a>
    </section>
  );
}
