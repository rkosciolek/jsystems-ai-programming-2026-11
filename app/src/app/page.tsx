import { Button } from "@/components/ui/button";

// Temporary placeholder for the brand check (T11). T15 replaces this page.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-12 md:px-8">
      <h1 className="text-[45px] leading-[55px] font-medium text-primary">
        Zgłoś reklamację lub zwrot
      </h1>
      <p className="text-[18px] leading-[28.8px] text-foreground">
        Opisz zgłoszenie, a asystent podpowie dalsze kroki obsługi serwisowej.
      </p>
      <div>
        <Button type="button">Wyślij zgłoszenie</Button>
      </div>
    </main>
  );
}
