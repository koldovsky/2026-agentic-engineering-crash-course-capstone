import { WaitlistForm } from "@/components/WaitlistForm";

export function WaitlistCta() {
  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-title"
      className="mx-auto max-w-5xl scroll-mt-4 px-4 py-12"
    >
      <h2 id="waitlist-title" className="text-3xl font-bold">
        Приєднайтеся до списку очікування
      </h2>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Це демо: реєстрації та надсилання листів не відбувається, адреса нікуди не передається і
        не зберігається.
      </p>
      <WaitlistForm />
    </section>
  );
}
