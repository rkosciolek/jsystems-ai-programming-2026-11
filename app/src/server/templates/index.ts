import 'server-only';

import {
  CATEGORIES,
  CITED_SECTION_REGEX,
  DECISION_LABELS,
  type CaseInput,
  type DateFacts,
} from '@/lib/domain';
import { pl } from '@/lib/i18n/pl';
import { textCitesSection } from '@/server/llm/citations';
import type { ClassifierResult, RuleOutcome } from '@/server/rules';

const HEADINGS = [
  `## ${pl.chat.sections.greeting}`,
  `## ${pl.chat.sections.summary}`,
  `## ${pl.chat.sections.assessment}`,
  `## ${pl.chat.sections.reasoning}`,
  `## ${pl.chat.sections.photo}`,
  `## ${pl.chat.sections.nextSteps}`,
] as const;

const SECTION_EXPLANATIONS: Record<string, { complaint: string; return: string }> = {
  '§1 ust. 2': {
    complaint: 'Regulamin obejmuje niezgodność towaru z umową.',
    return: 'W przypadku towaru wadliwego właściwą ścieżką może być reklamacja.',
  },
  '§1 ust. 3': {
    complaint: 'Regulamin reklamacji nie obejmuje gwarancji producenta.',
    return: 'Ta część regulaminu nie stanowi podstawy oceny zwrotu.',
  },
  '§2 ust. 1': {
    complaint: 'Odpowiedzialność sprzedawcy obejmuje wady ujawnione w ciągu 24 miesięcy od wydania towaru.',
    return: 'Przy zakupie internetowym odstąpienie od umowy jest możliwe w ciągu 14 dni od otrzymania towaru.',
  },
  '§2 ust. 4': {
    complaint: 'Po upływie 24 miesięcy reklamacja jest wstępnie odrzucana.',
    return: 'Ślady użytkowania wykraczające poza sprawdzenie towaru mogą skutkować pomniejszeniem jego wartości.',
  },
  '§3 ust. 1': {
    complaint: 'Wady fabryczne i materiałowe mogą podlegać reklamacji.',
    return: 'Zwrot dobrowolny w ciągu 30 dni wymaga towaru bez śladów użytkowania, kompletnego i nadającego się do ponownej sprzedaży jako nowy.',
  },
  '§3 ust. 2': {
    complaint: 'Ten punkt nie stanowi podstawy oceny reklamacji.',
    return: 'Towar niespełniający warunków zwrotu dobrowolnego nie podlega temu zwrotowi.',
  },
  '§3 ust. 3': {
    complaint: 'Ten punkt nie stanowi podstawy oceny reklamacji.',
    return: 'Dla zakupów stacjonarnych zwrot sprawnego towaru odbywa się na zasadach zwrotu dobrowolnego.',
  },
  '§4 ust. 1': {
    complaint: 'Uszkodzenia mechaniczne spowodowane przez użytkownika nie są objęte reklamacją.',
    return: 'Otwarty nośnik lub oprogramowanie z naruszonym zabezpieczeniem jest wyłączone ze zwrotu.',
  },
  '§4 ust. 2': {
    complaint: 'Uszkodzenia spowodowane zalaniem, wilgocią, korozją lub wysoką temperaturą nie są objęte reklamacją.',
    return: 'Towar wykonany według indywidualnej specyfikacji jest wyłączony ze zwrotu, z wyjątkiem wskazanym w regulaminie.',
  },
  '§4 ust. 3': {
    complaint: 'Uszkodzenia wynikające z nieuprawnionej naprawy lub modyfikacji nie są objęte reklamacją.',
    return: 'Otwarte słuchawki douszne z naruszonym zabezpieczeniem higienicznym są wyłączone ze zwrotu.',
  },
  '§5 ust. 1': {
    complaint: 'W pierwszej kolejności możliwa jest naprawa lub wymiana towaru.',
    return: 'Ten punkt nie stanowi podstawy oceny zwrotu.',
  },
  '§6 ust. 1': {
    complaint: 'Zgłoszenie wymaga danych urządzenia, opisu problemu i zdjęcia pokazującego wadę lub uszkodzenie.',
    return: 'Zgłoszenie wymaga danych urządzenia oraz zdjęcia pokazującego jego stan.',
  },
  '§7': {
    complaint: 'Regulamin przewiduje przekazanie sprawy do specjalisty w określonych sytuacjach.',
    return: 'Regulamin przewiduje przekazanie sprawy do specjalisty w określonych sytuacjach.',
  },
};

function categoryLabel(value: unknown, fallback: CaseInput['category']): string {
  const match = CATEGORIES.find((category) => category.id === value);
  return match?.label ?? CATEGORIES.find((category) => category.id === fallback)!.label;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

function caseTypeLabel(input: CaseInput): string {
  return pl.form.caseType[input.caseType].label;
}

function channelLabel(input: CaseInput): string {
  return pl.form.channel[input.channel];
}

function summary(input: CaseInput, classifier: ClassifierResult | null, caseId: string): string {
  return [
    `- Numer sprawy: ${caseId}`,
    `- Rodzaj zgłoszenia: ${caseTypeLabel(input)}`,
    `- Kategoria: ${categoryLabel(undefined, input.category)}`,
    `- Model: ${input.model}`,
    `- Data zakupu: ${formatDate(input.purchaseDate)}`,
    `- Kanał zakupu: ${channelLabel(input)}`,
  ].join('\n');
}

function decisionRationale(reasonCode: string, input: CaseInput): string {
  const complaint = input.caseType === 'complaint';
  const messages: Record<string, { complaint: string; return: string }> = {
    escalation_signal: {
      complaint: 'Zgłoszenie wymaga indywidualnej oceny specjalisty, między innymi ze względu na wskazane okoliczności.',
      return: 'Zgłoszenie wymaga indywidualnej oceny specjalisty ze względu na wskazane okoliczności.',
    },
    liability_expired: {
      complaint: 'Od daty zakupu upłynął okres odpowiedzialności sprzedawcy przewidziany dla reklamacji.',
      return: 'Ta przyczyna dotyczy reklamacji; zwrot oceniono na podstawie właściwych dla niego zasad.',
    },
    photo_unusable: {
      complaint: 'Na podstawie przesłanego zdjęcia nie można wiarygodnie ocenić zgłoszonej wady. Potrzebne jest nowe zgłoszenie ze zdjęciem, na którym urządzenie i istotny obszar są wyraźnie widoczne.',
      return: 'Na podstawie przesłanego zdjęcia nie można wiarygodnie ocenić stanu towaru. Potrzebne jest nowe zgłoszenie ze zdjęciem całego urządzenia.',
    },
    category_mismatch: {
      complaint: 'Zdjęcie nie pozwala potwierdzić, że widoczne urządzenie odpowiada kategorii podanej w zgłoszeniu.',
      return: 'Zdjęcie nie pozwala potwierdzić, że widoczne urządzenie odpowiada kategorii podanej w zgłoszeniu.',
    },
    description_photo_mismatch: {
      complaint: 'Opis zgłoszenia i zdjęcie są niespójne, dlatego potrzebne jest wyjaśnienie, którego elementu dotyczy wada.',
      return: 'Opis zgłoszenia i zdjęcie są niespójne, dlatego potrzebne jest wyjaśnienie dotyczące stanu towaru.',
    },
    user_caused_damage: {
      complaint: 'Widoczne uszkodzenie wskazuje na przyczynę, której regulamin reklamacji nie obejmuje.',
      return: 'Widoczne uszkodzenie wymaga oceny w ścieżce reklamacji, a nie jako zwrot sprawnego towaru.',
    },
    defect_within_period: {
      complaint: 'Opisane i widoczne okoliczności są zgodne z wadą, która może podlegać ocenie w ramach odpowiedzialności sprzedawcy.',
      return: 'Ta przyczyna dotyczy reklamacji; zwrot oceniono na podstawie właściwych dla niego zasad.',
    },
    invisible_defect_inspection: {
      complaint: 'Brak widocznego uszkodzenia zewnętrznego nie wyklucza wady niewidocznej na zdjęciu; urządzenie może zostać sprawdzone w serwisie.',
      return: 'Ta przyczyna dotyczy reklamacji; zwrot oceniono na podstawie właściwych dla niego zasad.',
    },
    no_rule_matched: {
      complaint: 'Dostępne informacje nie pozwalają rozstrzygnąć sprawy według jednoznacznej reguły, dlatego przekazujemy ją do indywidualnej oceny.',
      return: 'Dostępne informacje nie pozwalają rozstrzygnąć sprawy według jednoznacznej reguły, dlatego przekazujemy ją do indywidualnej oceny.',
    },
    llm_inconsistent: {
      complaint: 'Nie udało się uzyskać spójnej oceny na podstawie dostępnych informacji, dlatego sprawę powinien ocenić specjalista.',
      return: 'Nie udało się uzyskać spójnej oceny na podstawie dostępnych informacji, dlatego sprawę powinien ocenić specjalista.',
    },
    return_window_expired: {
      complaint: 'Ta przyczyna dotyczy zwrotu; reklamację oceniono na podstawie właściwych dla niej zasad.',
      return: 'Upłynął termin przewidziany dla zwrotu dobrowolnego.',
    },
    withdrawal_full: {
      complaint: 'Ta przyczyna dotyczy zwrotu; reklamację oceniono na podstawie właściwych dla niej zasad.',
      return: 'Zgłoszenie mieści się w terminie odstąpienia od umowy dla zakupu internetowego.',
    },
    withdrawal_with_deduction: {
      complaint: 'Ta przyczyna dotyczy zwrotu; reklamację oceniono na podstawie właściwych dla niej zasad.',
      return: 'Zakup internetowy mieści się w terminie odstąpienia, a widoczne ślady mogą oznaczać zmniejszenie wartości towaru.',
    },
    voluntary_return: {
      complaint: 'Ta przyczyna dotyczy zwrotu; reklamację oceniono na podstawie właściwych dla niej zasad.',
      return: 'Towar spełnia warunki zwrotu dobrowolnego w przewidzianym terminie.',
    },
    used_item_voluntary: {
      complaint: 'Ta przyczyna dotyczy zwrotu; reklamację oceniono na podstawie właściwych dla niej zasad.',
      return: 'Widoczne ślady użytkowania nie spełniają warunków zwrotu dobrowolnego.',
    },
  };
  return messages[reasonCode]?.[complaint ? 'complaint' : 'return'] ??
    'Sprawę oceniono na podstawie informacji ze zgłoszenia i wskazanych zasad.';
}

function citationExplanations(citedSections: string[], input: CaseInput): string {
  const key = input.caseType === 'complaint' ? 'complaint' : 'return';
  return citedSections
    .map((section) => `- ${section}: ${SECTION_EXPLANATIONS[section]?.[key] ?? 'Ta część regulaminu ma zastosowanie do wstępnej oceny zgłoszenia.'}`)
    .join('\n');
}

function classifierFinding(input: CaseInput, classifier: ClassifierResult | null): string {
  if (!classifier) return 'Nie udało się uzyskać wiarygodnego opisu zdjęcia.';

  const answers = classifier.answers;
  const device = categoryLabel(answers.device_category?.value, input.category).toLowerCase();
  if (answers.image_usable?.value === false) {
    return `Zdjęcie nie pozwala wiarygodnie ocenić stanu urządzenia z kategorii: ${device}.`;
  }

  if (input.caseType === 'complaint') {
    const visibleDamage = answers.visible_damage?.value === true;
    const cause = answers.damage_cause?.value;
    const causeText: Record<string, string> = {
      manufacturing_defect: 'możliwą wadę urządzenia',
      impact: 'uszkodzenie mogące być skutkiem uderzenia lub upadku',
      liquid: 'ślady mogące wskazywać na kontakt z cieczą',
      heat: 'ślady mogące wskazywać na działanie wysokiej temperatury',
      tampering: 'ślady mogące wskazywać na ingerencję w urządzenie',
      normal_wear: 'ślady zwykłego użytkowania',
    };
    if (visibleDamage) return `Na zdjęciu widać ${device} oraz ${causeText[String(cause)] ?? 'widoczne uszkodzenie'}.`;
    return `Na zdjęciu widać ${device} bez widocznych uszkodzeń zewnętrznych.`;
  }

  const conditionValue = answers.condition?.value;
  const conditionText: Record<string, string> = {
    '0': 'zabezpieczony, nowy towar w opakowaniu',
    '1': 'towar w stanie zbliżonym do nowego',
    '2': 'niewielkie ślady użytkowania',
    '3': 'wyraźne ślady użytkowania',
    '4': 'uszkodzony towar',
  };
  const condition = conditionText[String(conditionValue)] ?? 'stan, którego nie można jednoznacznie określić';
  const packaging = answers.packaging_visible?.value === true
    ? 'Na zdjęciu widać również opakowanie lub akcesoria.'
    : answers.packaging_visible?.value === false
      ? 'Na zdjęciu nie widać oryginalnego opakowania ani akcesoriów.'
      : '';
  return [`Na zdjęciu widać ${device} oraz ${condition}.`, packaging].filter(Boolean).join(' ');
}

function nextSteps(
  input: CaseInput,
  outcome: RuleOutcome,
  classifier: ClassifierResult | null,
  caseId: string,
  facts: DateFacts,
): string {
  const reasonCode = outcome.reasonCodes[0] ?? outcome.templateKey;
  const complaint = input.caseType === 'complaint';
  const conditionFour = outcome.notes?.complaintHint === true || classifier?.answers.condition?.value === 4;
  let steps: string[];

  if (reasonCode === 'escalation_signal' || reasonCode === 'no_rule_matched' || reasonCode === 'llm_inconsistent') {
    steps = [
      `Przygotuj numer sprawy ${caseId} i informacje dotyczące zgłoszenia.`,
      `Specjalista skontaktuje się w sprawie numeru ${caseId}.`,
    ];
  } else if (reasonCode === 'photo_unusable' || reasonCode === 'category_mismatch' || reasonCode === 'description_photo_mismatch') {
    steps = complaint
      ? ['Rozpocznij nową sprawę z wyraźnym zdjęciem urządzenia i obszaru wady.', 'W rozmowie możesz doprecyzować opis zgłoszenia.']
      : ['Rozpocznij nową sprawę ze zdjęciem całego urządzenia, które pozwala ocenić jego stan.', 'W rozmowie możesz doprecyzować opis zgłoszenia.'];
  } else if (complaint) {
    steps = [
      'Przed wysyłką wykonaj kopię zapasową danych i usuń blokady konta.',
      'Zapakuj urządzenie z ładowarką i akcesoriami potrzebnymi do sprawdzenia wady.',
      'Koszt wysyłki reklamowanego towaru do serwisu ponosi sprzedawca; ostateczna odpowiedź jest udzielana w ciągu 14 dni od otrzymania zgłoszenia.',
    ];
    if (outcome.decision === 'rejected' && reasonCode === 'liability_expired') {
      steps = ['Możesz rozważyć płatną naprawę pogwarancyjną.', 'Jeśli masz nowe okoliczności, przedstaw je w rozmowie.'];
    }
  } else {
    steps = [
      'Przywróć ustawienia fabryczne, wyloguj się z kont i usuń blokady urządzenia.',
      'Zapakuj towar tak, aby nie uległ uszkodzeniu w transporcie, najlepiej w oryginalnym opakowaniu z akcesoriami.',
      'Ostateczna decyzja i ewentualne pomniejszenie zwrotu są ustalane przez serwis po otrzymaniu towaru.',
    ];
    if (reasonCode === 'withdrawal_full' || reasonCode === 'withdrawal_with_deduction') {
      steps[2] = reasonCode === 'withdrawal_with_deduction'
        ? 'Kwota zwrotu może zostać pomniejszona o wartość ustaloną przez serwis po otrzymaniu towaru.'
        : 'Sprzedawca zwraca płatność w ciągu 14 dni od otrzymania oświadczenia o odstąpieniu; może wstrzymać zwrot do czasu otrzymania towaru.';
      if (reasonCode === 'withdrawal_with_deduction') {
        steps.push('Sprzedawca zwraca płatność w ciągu 14 dni od otrzymania oświadczenia o odstąpieniu; może wstrzymać zwrot do czasu otrzymania towaru.');
      }
      steps.push('Bezpośredni koszt odesłania towaru ponosisz samodzielnie.');
    }
    if (outcome.decision === 'rejected' && reasonCode === 'used_item_voluntary') {
      steps = ['Jeśli towar jest wadliwy lub uszkodzony, możesz rozważyć złożenie reklamacji.'];
    }
  }

  if (!complaint && conditionFour && (reasonCode === 'withdrawal_with_deduction' || reasonCode === 'used_item_voluntary')) {
    steps.push('Jeśli towar ma wadę, możesz zgłosić ją w ramach reklamacji zamiast zwrotu.');
  }

  if (facts.nearDeadline !== null) {
    steps.push('datę zakupu traktujemy jako datę wydania/otrzymania towaru przy obliczaniu terminu.');
  }

  return steps.map((step) => `- ${step}`).join('\n');
}

export function renderFirstMessage(
  input: CaseInput,
  outcome: RuleOutcome,
  classifier: ClassifierResult | null,
  caseId: string,
  facts: DateFacts,
): string {
  return [
    HEADINGS[0],
    'Dziękujemy za przesłanie zgłoszenia. Przygotowaliśmy jego wstępną ocenę.',
    HEADINGS[1],
    summary(input, classifier, caseId),
    HEADINGS[2],
    `**${DECISION_LABELS[outcome.decision]}**`,
    HEADINGS[3],
    decisionRationale(outcome.reasonCodes[0] ?? outcome.templateKey, input),
    citationExplanations(outcome.citedSections, input),
    HEADINGS[4],
    classifierFinding(input, classifier),
    HEADINGS[5],
    nextSteps(input, outcome, classifier, caseId, facts),
  ].join('\n\n');
}

export function finalizeFirstMessage(markdown: string): string {
  const content = markdown
    .split(/\n\s*\n/)
    .filter((paragraph) => !paragraph.toLocaleLowerCase('pl-PL').includes('wstępna ocena przygotowana automatycznie'))
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
  return [content, pl.disclaimer].filter(Boolean).join('\n\n');
}

export function validateFirstMessage(
  markdown: string,
  citedSections: string[],
): { ok: true } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  let lastHeadingPosition = -1;
  const lines = markdown.split(/\r?\n/);

  for (const heading of HEADINGS) {
    const position = lines.indexOf(heading);
    if (position < 0) {
      problems.push(`Brakuje nagłówka ${heading}.`);
      continue;
    }
    if (position <= lastHeadingPosition) problems.push(`Nagłówek ${heading} jest w nieprawidłowej kolejności.`);
    lastHeadingPosition = position;
  }

  if (citedSections.length === 0) problems.push('Wymagane jest co najmniej jedno cytowane postanowienie.');
  for (const section of citedSections) {
    if (!CITED_SECTION_REGEX.test(section)) {
      problems.push(`Nieprawidłowy format cytowania: ${section}.`);
    } else if (!textCitesSection(markdown, section)) {
      problems.push(`Cytowane postanowienie ${section} nie występuje w treści wiadomości.`);
    }
  }

  return problems.length === 0 ? { ok: true } : { ok: false, problems };
}
