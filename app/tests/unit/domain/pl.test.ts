import { describe, expect, it } from "vitest";
import { pl } from "../../../src/lib/i18n/pl";

// Every UI string quoted in PRD section 6 (AC-04 to AC-52, the ones that are UI text)
// and section 9 (UI description) and section 4 (flows). TAC-003-04: each must exist
// verbatim in src/lib/i18n/pl.ts.
const PRD_UI_STRINGS = [
  // Application name and form screen (PRD 9.1)
  "Hardware Service Decision Copilot",
  "Zgłoś reklamację lub zwrot",
  "Reklamacja",
  "Zwrot",
  "Urządzenie jest wadliwe lub uszkodzone",
  "Chcę oddać sprawne urządzenie",
  "np. Lenovo ThinkPad T14 Gen 4",
  "Opisz, co się dzieje z urządzeniem, od kiedy i w jakich sytuacjach.",
  "Powód zwrotu (opcjonalnie)",
  "Zdjęcie pokazujące uszkodzenie lub wadę.",
  "Zdjęcie całego urządzenia pokazujące jego stan.",
  "Wybierz zdjęcie",
  "Usuń",
  "Wyślij zgłoszenie",
  "Popraw zaznaczone pola.",
  "Spróbuj ponownie",
  // AC-02, AC-06, AC-08
  "Sklep internetowy",
  "Sklep stacjonarny",
  "(opcjonalnie)",
  // AC-04, AC-05, AC-07, AC-12, AC-13
  "Podaj nazwę lub model urządzenia (2–100 znaków).",
  "Data zakupu nie może być z przyszłości.",
  "Opisz problem (min. 20 znaków).",
  "Dozwolone formaty: JPG, PNG, WEBP.",
  "Plik przekracza limit 10 MB.",
  // AC-22 decisions
  "Wstępnie zaakceptowano",
  "Wstępnie odrzucono",
  "Wymaga uzupełnienia",
  "Przekazano do specjalisty",
  // AC-25 disclaimer
  "To jest wstępna ocena przygotowana automatycznie. Ostateczną decyzję potwierdzi nasz zespół serwisowy w ciągu 14 dni od otrzymania zgłoszenia.",
  // AC-23 first message sections (PRD 9.3)
  "Dzień dobry",
  "Podsumowanie zgłoszenia",
  "Wstępna ocena",
  "Uzasadnienie",
  "Co widzimy na zdjęciu",
  "Kolejne kroki",
  // AC-36 revised assessment label
  "Zmieniona ocena",
  // AC-32, AC-33, AC-38, AC-44 chat controls
  "Wyślij",
  "Nowa sprawa",
  "Rozpocząć nową sprawę? Bieżąca rozmowa zostanie utracona.",
  // AC-46 chat error and retry
  "Nie udało się wysłać odpowiedzi.",
  "Ponów",
  // AC-45 analysis error banner
  "Nie udało się przeanalizować zgłoszenia. Spróbuj ponownie za chwilę.",
  // AC-52 expired case
  "Sprawa wygasła. Rozpocznij nową sprawę.",
  // PRD 9.2 progress lines
  "Przesyłanie zdjęcia",
  "Analiza zdjęcia",
  "Przygotowanie oceny",
];

describe("pl (Polish UI strings)", () => {
  it("exports the application name exactly", () => {
    expect(pl.appName).toBe("Hardware Service Decision Copilot");
  });

  it("exports the AC-25 disclaimer exactly", () => {
    expect(pl.disclaimer).toBe(
      "To jest wstępna ocena przygotowana automatycznie. Ostateczną decyzję potwierdzi nasz zespół serwisowy w ciągu 14 dni od otrzymania zgłoszenia.",
    );
  });

  it("exports the form title exactly", () => {
    expect(pl.form.title).toBe("Zgłoś reklamację lub zwrot");
  });

  it("keeps the AC-07 and AC-04 messages verbatim in the error group", () => {
    const serialized = JSON.stringify(pl.errors);
    expect(serialized).toContain("Opisz problem (min. 20 znaków).");
    expect(serialized).toContain("Podaj nazwę lub model urządzenia (2–100 znaków).");
  });

  it("keeps internal names out of customer-facing error strings (AC-47)", () => {
    expect(JSON.stringify(pl.errors)).not.toMatch(/openrouter|openai|jev|gpt|luna|stack|Error:/i);
  });

  it.each(PRD_UI_STRINGS)("contains the PRD UI string %s verbatim", (text) => {
    expect(JSON.stringify(pl)).toContain(text);
  });
});
