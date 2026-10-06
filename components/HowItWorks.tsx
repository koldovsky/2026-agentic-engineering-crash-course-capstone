const steps = [
  { title: "Специфікація", text: "Опишіть задачу, вимоги та сценарії приймання." },
  { title: "Реалізація", text: "Агент реалізує зміни відповідно до специфікації." },
  { title: "Перевірка", text: "Тести та незалежний рецензент підтверджують результат." },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="mx-auto max-w-5xl scroll-mt-4 px-4 py-12"
    >
      <h2 id="how-title" className="text-3xl font-bold">
        Як це працює
      </h2>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            <span className="text-sm text-zinc-500">Крок {i + 1}</span>
            <h3 className="mt-1 font-semibold">{s.title}</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
