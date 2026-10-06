const items = [
  {
    q: "Що таке AgentFlow?",
    a: "Це вигаданий сервіс, який показує структурований підхід до розробки з ШІ-агентами.",
  },
  {
    q: "Чи можна вже користуватися сервісом?",
    a: "Ні. Це демонстраційна сторінка, а список очікування працює лише локально.",
  },
  {
    q: "Чи зберігається моя пошта?",
    a: "Ні. Адреса нікуди не надсилається і не зберігається.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-12">
      <h2 id="faq-title" className="text-3xl font-bold">
        Поширені питання
      </h2>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <details key={item.q} className="faq-item rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="faq-summary cursor-pointer font-semibold">{item.q}</summary>
            <p className="pt-2 text-zinc-600 dark:text-zinc-400">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
