const features = [
  {
    title: "Чіткі специфікації",
    text: "Кожна задача починається з вимог і сценаріїв приймання, а не з коду.",
  },
  {
    title: "Передбачувана реалізація",
    text: "Агенти працюють малими кроками, а кожен крок можна звірити зі специфікацією.",
  },
  {
    title: "Незалежна перевірка",
    text: "Окремий рецензент перевіряє зміни, а тести підтверджують поведінку.",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-12">
      <h2 id="features-title" className="text-3xl font-bold">
        Можливості
      </h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <li key={f.title} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{f.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
