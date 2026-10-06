const plans = [
  { name: "Старт", price: "$0", text: "Для одного розробника, який пробує процес." },
  { name: "Команда", price: "$19", text: "Для малої команди зі спільними специфікаціями." },
  { name: "Бізнес", price: "$49", text: "Для кількох команд із вимогами до перевірки." },
];

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-12">
      <h2 id="pricing-title" className="text-3xl font-bold">
        Тарифи
      </h2>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Це приклади тарифів для демонстрації; придбати їх неможливо.
      </p>
      <ul className="mt-8 grid gap-6 sm:grid-cols-3">
        {plans.map((p) => (
          <li
            key={p.name}
            data-testid="plan"
            className="flex flex-col rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h3 className="font-semibold">{p.name}</h3>
            <p className="mt-2 text-3xl font-bold">
              {p.price}
              <span className="text-base font-normal text-zinc-500"> / міс (приклад)</span>
            </p>
            <p className="mt-2 flex-1 text-zinc-600 dark:text-zinc-400">{p.text}</p>
            <a
              href="#waitlist"
              className="mt-4 inline-block rounded-md border border-foreground px-4 py-2 text-center font-medium"
            >
              Приєднатися до списку очікування
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
