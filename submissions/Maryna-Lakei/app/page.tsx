import { RequestIntakeForm } from "./request-intake-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
        AI Requirements Assistant
      </h1>
      <RequestIntakeForm />
    </main>
  );
}
