# Czy język promptu zmienia jakość LLM i agentów? Polski i języki słowiańskie vs angielski

Przegląd dowodów, 24 listopada 2026. Wersja angielska: [REPORT.en.md](REPORT.en.md). Surowe raporty agentów i logi weryfikacji: [evidence/](evidence/).

## 1. Wniosek

1. **„Polski bije angielski” nie utrzymuje się jako teza ogólna.** Artykuł na cryps.pl (25.10.2025) opiera się na jednym benchmarku, OneRuler (arXiv 2503.01996). Mierzy on wyszukiwanie „igły w stogu siana” przy 64K i 128K tokenów, uśrednione po siedmiu modelach z lat 2024–25, z inną książką źródłową dla każdego języka i bez testu istotności. Nie znaleźliśmy replikacji na modelach frontowych z 2026 roku.
2. **Tam, gdzie porównanie jest równe (te same pytania, ten sam model), angielski wypada tak samo lub nieco lepiej.** Różnica to kilka punktów dla mocnych modeli i spada do poziomu szumu statystycznego przy rozumowaniu z wysokim wysiłkiem (mmPISA, czerwiec 2026). Jest większa dla starszych lub mniejszych modeli, dla wykonywania instrukcji i dla zadań agentowych.
3. **Język wpływa na wynik, ale głównie przez rozumienie tekstu i koszt, a nie przez inny „poziom rozumowania”.** Jedno badanie z 2026 roku wskazuje, że luka w modelach rozumujących to głównie błąd rozumienia języka, który w dużej mierze naprawia tłumaczenie około 20% wejścia. Polski tekst kosztuje też około 1,8 raza więcej tokenów niż ten sam tekst po angielsku, czyli jest droższy i skraca efektywny kontekst.
4. **Danych o polskim jest mało.** Polskiego brakuje w większości benchmarków agentowych, wywoływania narzędzi oraz w MMLU-ProX i PolyMath. Nie znaleźliśmy badania z 2026 roku, które porównuje ten sam model, zadanie i dane po polsku i po angielsku w wyszukiwaniu, RAG lub zadaniach agentowych. Polskie oceny (Bielik, PLLuM) nie mają angielskiego punktu odniesienia.

Pewność tego podsumowania: **średnia**. Wszystkie liczby poniżej sprawdził drugi, silniejszy model w dokumentach źródłowych, ale przez streszczacz stron WWW, a nie przez surowy tekst PDF. Przed zacytowaniem na zewnątrz sprawdź ręcznie pięć liczb oznaczonych ★.

## 2. Co twierdzi artykuł i co mówi źródło pierwotne

| Element | Artykuł (cryps.pl) | Źródło pierwotne (OneRuler, arXiv 2503.01996) |
|---|---|---|
| Ranking | Polski 1. z 26, angielski 6. | Potwierdzone (rozdz. 3.1): polski 88% średnio, angielski 83,9% (6. z 26), chiński 62,1% |
| Zakres | „64k i 128k tokenów” | Średnie to zadania NIAH uśrednione po wszystkich modelach i po 64K+128K. Tylko zdanie o polskim podaje długości wprost. Wartości dla poszczególnych długości nie są wydrukowane |
| Modele | Gemini 1.5 Flash, Llama 3, Qwen2.5 | Qwen2.5 7B/72B, Llama 3.1 8B, Llama 3.3 70B, o3-mini-high, Gemini 1.5 Flash; DeepSeek-R1 tylko po angielsku. Brak GPT-5.x, Gemini 2.5/3, Claude 4.x, Qwen3 |
| Przyczyna | „Złożona struktura może zmniejszać niejednoznaczność” (spekulacja) | Praca nie podaje przetestowanego wyjaśnienia |

Fakty o pracy, których artykuł nie wspomina:

- **Inna książka dla każdego języka** (dodatek A, tabela 4): angielski „Little Women”, polski „Noce i dnie” t. 3, czeski „Szwejk” t. 3, rosyjski „Wojna i pokój”, serbski Dragutin Ilić, ukraiński Marko Wowczok. Język i tekst są ze sobą pomieszane.
- **Brak przedziałów ufności i testu istotności** dla rankingu języków. Zdanie „nieistotne statystycznie” pojawia się tylko w tekście PAP (27.11.2025), słowami dziennikarza. W pracy go nie ma.
- **Jeden model napędza dużą część efektu.** o3-mini-high przy 128K: polski 92%, ukraiński 89%, angielski 67%; opcja „none” obniża angielski S-NIAH o 32% przy 128K (rozdz. 3.1 i 4).
- **Język instrukcji znaczy tyle samo:** kontekst angielski z instrukcją koreańską spadł z 91% do 71% przy 64K (jedna komórka, rozdz. 4).
- Języki słowiańskie w benchmarku: czeski, polski, rosyjski, serbski, ukraiński. Nie ma słowackiego, chorwackiego, słoweńskiego ani bułgarskiego.
- Wersje: v1 3.03.2025, v2 8.08.2025, v3 30.09.2025. „COLM 2025” pojawia się tylko w streszczeniu wyszukiwarki dla nagłówka PDF i **nie jest potwierdzone**.
- Wartości dla poszczególnych języków są tylko na wykresie słupkowym. Przybliżone odczyty z wykresu odtworzonego przez cryps.pl (±1,5 pkt): polski 88,5, rosyjski 86, angielski 84, ukraiński 83, czeski 73,5, serbski 71, chiński 62,5. To odczyty, a nie opublikowane liczby.

## 3. Dowody według obszarów

Legenda: ✔ zweryfikowane niezależnie drugim przejściem; ◐ zweryfikowane na poziomie streszczenia lub częściowo; ✖ niezweryfikowane. „Porównanie równe” oznacza te same pytania i ten sam model w obu językach.

### 3.1 Wyszukiwanie w długim kontekście

| Wynik | Liczby | Źródło | Porównanie równe | Status |
|---|---|---|---|---|
| Średnie OneRuler (wyżej) | PL 88, EN 83,9 | arXiv 2503.01996, rozdz. 3.1 | Nie (różne książki, uśrednione modele) | ✔ ★ |
| Nowsze modele z danymi w stylu OneRuler | Qwen3/3.5, Granite 4.0: angielski vs średnia z 10 języków; nie przeczytano wierszy słowiańskich | arXiv 2609.35378, tab. 2 (wrzesień 2026) | n/d | ◐ |
| Receptura rozumowania w długim kontekście, 10 języków, z rosyjskim jako jedynym słowiańskim | brak PL/EN/CS/UK/SR | arXiv 2605.12227, tab. 11 | n/d | ◐ |
| Karta Gemini 3.1 Pro (19.02.2026) | MRCR v2 128K 84,9%, MMMLU 92,6%, tylko wartości zagregowane | karta modelu deepmind.google | n/d | ✔ |
| Karta DeepSeek-V4-Pro | MRCR 1M 83,5, wartości zagregowane; data karty niepotwierdzona | karta modelu na Hugging Face | n/d | ✔ |
| Inne wielojęzyczne benchmarki długiego kontekstu | MLRBench, LongBench Pro, LOOM-Scope, mLongRR nie mają polskiego; rosyjski tylko w LIBRA (2025) | arXiv / ACL Anthology | n/d | ◐ |

Wynik: **brak danych z 2026 roku per język dla długiego kontekstu polskiego na modelach frontowych.** Karty systemowe GPT-5.x i Claude nie zostały sprawdzone (PDF-ów nie dało się odczytać). To znaczy „nie sprawdzono”, a nie „nie istnieje”.

### 3.2 Wyszukiwanie informacji i RAG

| Wynik | Liczby | Źródło | Porównanie równe | Status |
|---|---|---|---|---|
| BEIR-PL, BM25 (13 zbiorów, Google Translate; 11 z angielskim BM25) | EN 42,41 vs PL 35,67 nDCG@10 (−6,74). Przeliczone z tabeli 3 | praca BEIR-PL (2024) | Tak, tłumaczenie maszynowe | ✔ |
| multilingual-e5-large na sześciu zbiorach tłumaczonego BEIR | EN 48,57 vs PL 44,25 (−4,32; na zbiór od −1,4 do −10,8). BM25 na tych samych zbiorach: −5,26 | mE5 arXiv 2402.05672 tab. 7 vs PL-MTEB arXiv 2405.10138 tab. 7 | Z grubsza (dwie prace, dwa przebiegi, polski MT, starszy model) | ✔ |
| Tabele embedderów 2026 | PIRB: Qwen3-Embedding-8B 60,93, PolDense-1B 64,11, stella-pl 62,69, mE5-large 57,29 | arXiv 2609.12913, tab. 1 (wrzesień 2026) | **Nie.** Zestaw angielski (14 BEIR + 8 RTEB) różni się od polskiego (PIRB, 41 zadań); to nie jest kara za język | ✔ |
| Wpływ języka zapytania w RAG | Rosyjski: luki cytowań na korzyść angielskiego od −4,2 do −12,2 pkt. Polskiego, czeskiego i ukraińskiego nie badano | arXiv 2509.13930, tab. 13 (ICML 2026 spotlight) | n/d | ✔ |
| Odczytanie przeciwne | Preferencja angielskiego jest „głównie” artefaktem rozkładu dowodów (tylko MKQA) | arXiv 2601.02956 | n/d | ✔ |
| Mieszane korpusy faworyzują dokumenty angielskie | Brak polskiego i czeskiego; rosyjski tylko w 2606.13537 (ACL 2026 Main) | arXiv 2604.05684, 2606.13537 | n/d | ✔ |
| Polski RAG 2026 | Średnie sędziego: Bielik 4,521 vs PLLuM 4,025; Bielik preferowany w 81,5% tylko przy korzystnej kolejności (54,3% przy odwróconej, a z sędzią Qwen wygrywa PLLuM 63,7%). Brak ramienia angielskiego | LREC 2026 (2026.lrec-1.211), tab. 3–5 | n/d | ✔ |

Wynik: jakość wyszukiwania po polsku jest **nieco niższa** niż po angielsku w porównywalnych, tłumaczonych benchmarkach (−4 do −7 pkt nDCG), na starszych modelach i z tłumaczeniem maszynowym. **Nie ma dowodu, że polskie zapytania wygrywają z angielskimi** w wyszukiwaniu lub RAG. Tabele retrievalowe z 2026 roku nie są porównaniami równymi i nie wolno ich czytać jako efektu języka.

### 3.3 Rozumowanie i wiedza

**mmPISA-bench** (arXiv 2606.07069, 5.06.2026) to najużyteczniejsze źródło z 2026 roku: zadania matematyczne i czytania w stylu PISA, 43 języki, oficjalne tłumaczenia ludzkie, 25 pytań na komórkę, 5 przebiegów. Dokładność w %:

| Język | Claude Haiku 4.5 (bez rozumowania) | Claude Opus 4.5 (wysoki wysiłek) | GPT-5.1 (none) | GPT-5.1 (high) |
|---|---|---|---|---|
| Angielski | 90,4 | 100,0 | 76,8 | 96,8 |
| **Polski** | 87,2 | 94,4 | 78,4 | 96,0 |
| Czeski | 84,8 | 96,8 | 79,2 | 94,4 |
| Rosyjski | 85,6 | 95,2 | 84,8 | 94,4 |
| Bułgarski | 85,6 | 96,8 | 84,0 | 90,4 |
| Słowacki | 88,0 | 96,0 | 74,4 | 95,2 |
| Słoweński | 89,6 | 95,2 | 80,0 | 96,0 |
| Chorwacki | 88,8 | 96,8 | 78,4 | 96,0 |
| Serbski | 87,2 | 99,2 | 77,6 | 96,0 |
| Średnia ze wszystkich 43 | 87,5 | 96,6 | 78,9 | 95,7 |

Zastrzeżenia: dwie kolumny Claude to **różne modele** (Haiku i Opus), więc nie pokazują efektu wysiłku. Polski minus angielski to −3,2, −5,6, +1,6, −0,8 pkt. Przy traktowaniu 5 przebiegów jako niezależnych p≈0,014 wychodzi tylko dla komórki Claude z wysokim wysiłkiem; przebiegi powtarzają te same 25 pytań, więc efektywna różnica to około 1,4 pytania i wszystkie cztery różnice mieszczą się w szumie. Tłumaczenie ludzkie i maszynowe dają podobne sumy (Claude 92,3 vs 92,8, GPT 89,5 vs 90,1). Brak ukraińskiego. Modele z końca 2025 roku.

**Pozostałe dowody**

| Wynik | Liczby | Źródło | Status |
|---|---|---|---|
| PluraMath: polski jest jednym z 18 języków docelowych, tłumaczenie DeepL, 500 pozycji na język | Claude Haiku 4.5: en 33,5, średnia języków wysokozasobowych 28,7, pl 26,3, cs 27,6, sr 27,1, uk 32,3, sk 18,1. GPT-5.4: en 17,3, średnia 16,2, pl 16,2, cs 15,6, sr 16,0, uk 16,5, sk 14,5. „+0,67 dla greckiego i polskiego” z pracy to wartość łączna, której nie udało się odtworzyć | arXiv 2607.05992 (lipiec 2026) | ◐ (dopasowano dwa wiersze modeli) |
| MMLU-ProX: angielski przed czeskim, rosyjskim, serbskim i ukraińskim we wszystkich 15 sprawdzonych komórkach, o 0,6 do 8,6 pkt; największe luki dla rosyjskiego: o4-mini −11,7, GPT-4.1 −8,6. **Brak polskiego** | arXiv 2503.10497, tab. 3 (starsze modele) | ✔ |
| PolyMath, najtrudniejszy podzbiór: rosyjski ≥ angielski dla DeepSeek-R1 i o1-mini, niżej dla Gemini 2.5 Pro. **Brak polskiego** (18 języków) | arXiv 2504.18428 (NeurIPS 2025) | ✔ |
| Wymuszenie łańcucha rozumowania w języku niskozasobowym szkodzi: suahili MATH-500 57,4 vs 25,9 | arXiv 2505.17407 (przeliczone z czterech modeli) | ✔ |
| Łańcuch rozumowania w języku docelowym przegrywa z łańcuchem z angielskim pivotem; dziewięć języków, brak słowiańskich | arXiv 2508.14828 (ICLR 2026) | ✔ |
| W modelach rozumujących luka to głównie rozumienie języka; tłumaczenie około 20% wejścia odzyskuje większość | arXiv 2510.27269 (Findings ACL 2026) | ◐ poziom streszczenia |
| Polska praca o rozumowaniu z ramieniem angielskim (Llama-PLLuM-8B-instruct): Belebele PL 0,609 vs EN 0,656. Nie jest porównaniem równym (900 próbkowanych pozycji na zbiór, brak informacji, że PL i EN są równoległe, sędzia LLM) | EACL 2026 Findings (findings-eacl.92), tab. 3 | ✔ tylko orientacyjnie |
| CUS-QA (czeski, słowacki, ukraiński, pytania wiedzy), Llama-3.3-70B, blok Czech: cs 57,5, sk 52,3, uk 30,0, en 56,2. „en” to angielskie tłumaczenie od adnotatorów; pozostałe to tłumaczenia maszynowe. Kierunek zmienia się z sędzią (sędzia LLM faworyzuje angielski, sędziowie ludzcy język lokalny) | TACL 2026, DOI 10.1162/tacl.a.737, tab. 10, 11, 15 | ✔ |
| OpenAI MMMLU ma 14 języków: bez polskiego, rosyjskiego, ukraińskiego, czeskiego i serbskiego | karta GPT-5 / Hugging Face | ✔ |

Wynik: **żadne źródło pierwotne nie pokazuje, że polskie rozumowanie przewyższa angielskie.** Różnice są małe (w szumie) dla mocnych modeli rozumujących, a większe dla słabszych albo gdy rozumowanie wymusza się w języku niskozasobowym.

### 3.4 Wykonywanie instrukcji i agenci

| Wynik | Liczby | Źródło | Porównanie równe | Status |
|---|---|---|---|---|
| Marco-Bench-MIF (IFEval w 30 językach; polski jest lokalizowany, a nie tłumaczony maszynowo) | Polski vs angielski: Claude 3.5 Sonnet 74,5 vs 90,3; GPT-4o 73,0 vs 87,8; wiersz średniej w tab. 3: 58,6 vs 76,2 (metryka nie jest nazwana w podpisie; zgadza się ze średnią czterech metryk IFEval z tab. 2) | arXiv 2507.11882 (ACL 2025) | Częściowo | ✔ (modele z 2025) |
| OmnilingualGAIA2 (zadania agentowe; 10 języków docelowych, **bez polskiego**) | Angielski vs średnia języków docelowych: Gemini-3.1-Pro 62,2 vs 53,4; Claude-4.7-Opus 82,7 vs 73,6; GPT-5.4 68,4 vs 58,5; Gemma-4-31B 63,3 vs 51,4; Qwen-3.6-27B 62,2 vs 50,2; Kimi-2.6 66,5 vs 54,2; Qwen-3.6-35B-A3B 56,6 vs 38,2. Luki 8,8 do 18,4 pkt (przeliczone). Angielski jest wyższą stroną w każdym wierszu | arXiv 2608.08775, tab. 1 (sierpień 2026) | Tak (tłumaczone scenariusze, testy parowane) | ✔ ★ |
| Inne benchmarki agentowe i wywoływania narzędzi (MAPS, tau-bench-LILT, MLCL) | Żaden nie obejmuje polskiego | arXiv 2505.15935, 2611.07203, 2601.05366 | n/d | ◐ poziom streszczenia |

Wynik: dla zadań agentowych najnowsze dowody (2026, aktualne modele) pokazują angielski **o 9–18 pkt przed** innymi językami. Autorzy pracy twierdzą, że luka nie maleje ze skalą modelu (nie sprawdzono niezależnie). Polskiego nie testowano.

### 3.5 Tokenizacja i koszt

| Wynik | Liczby | Źródło | Status |
|---|---|---|---|
| Tokeny na słowo, sześć tokenizerów (średnia), równoległy tekst SIB-200 | EN 1,23; PL 2,25; CS 2,28; HR 2,31; SL 2,28; BG 2,33; SK 2,45; UK 2,66. PL/EN ≈ 1,83 | arXiv 2605.24718, tab. 4 (maj 2026; preprint jednego autora; streszczenie mówi o 25 językach, tytuł HTML o 24) | ✔ ★ |
| Preambuła polskiej konstytucji, tokeny PL vs EN | Llama 2: 681 vs 427 (1,59); Mistral v0.1: 747 vs 408 (1,83); polski tokenizer Bielika 344 vs 615 (0,56) | arXiv 2410.18565, tab. 2 (2024) | ✔ |
| Tabela Bielik 11B v3 | Qwen3 625 vs 373 (1,68); EuroLLM 437 vs 404 (1,08); Mistral Small 3.2 547 vs 377 (1,45) | arXiv 2601.11579 (PDF) | ✔ |
| Największa luka tokenowa między językami | „do 15×” to ekstremum po wszystkich parach języków, a nie dla słowiańskich. Polski około 1,7–1,9× angielskiego na LLaMA, Qwen, cl100k | Petrov i in., arXiv 2305.15425 i CSV z repozytorium | ✔ |

Konsekwencja: ta sama treść po polsku kosztuje około 1,8 razy więcej i wypełnia stałe okno kontekstu około 1,8 razy szybciej. Tokenizer dostosowany do polskiego może to odwrócić (0,56). Tokenizacja mierzy koszt, a nie kompetencję. Własny pomiar tiktokenem nie został ukończony, bo piaskownica zablokowała pobranie równoległego tekstu.

## 4. Czy język zmienia poziom rozumowania agenta?

Co potwierdzają dowody:

- **Tak, trochę i nierówno.** Benchmarki z tymi samymi pytaniami pokazują angielski równy lub lepszy prawie w każdej komórce; luka sięga od szumu (modele frontowe, wysoki wysiłek rozumowania, mmPISA) przez 9–18 pkt (zadania agentowe w językach innych niż polski) po około 15 pkt (wykonywanie instrukcji, modele z 2025).
- **Mechanizm wskazuje na rozumienie, a nie logikę.** Luki modeli rozumujących wyraźnie maleją, gdy tłumaczy się tylko część wejścia (arXiv 2510.27269, poziom streszczenia). Wymuszenie łańcucha rozumowania w języku niskozasobowym szkodzi znacznie bardziej niż wymuszenie go po angielsku.
- **Mocne modele z wysiłkiem rozumowania w dużej mierze zamykają lukę dla języków słowiańskich.** To oparte na jednym benchmarku z 25 pytaniami na komórkę, więc traktuj to jako wskazówkę.
- **Wyszukiwanie w długim kontekście to jedyne miejsce, gdzie polski wyglądał najlepiej,** a wynik ma czynniki zakłócające (różne książki, uśrednione modele, jeden model napędzający efekt). Mówi niewiele o rozumowaniu.
- **Koszt różni się pewniej niż jakość:** około 1,8× tokenów dla polskiego i czeskiego oraz 2,3–2,7× dla ukraińskiego i bułgarskiego względem 1,23 tokena na słowo w angielskim.

Czego dowody nie potwierdzają: że polskie prompty sprawiają, iż model rozumuje lepiej niż przy promptach angielskich.

## 5. Czego nie znaleźliśmy (i jak szukaliśmy)

Wysiłek wyszukiwania: sześciu agentów badawczych wykonało około 335 wywołań narzędzi (wyszukiwania i pobrania stron) po angielsku, polsku, czesku, rosyjsku i ukraińsku (WS1: 8 iteracji w językach narodowych; WS5: 6 iteracji plus fala uzupełniająca; WS2: około 29 zapytań; WS6: 17 wyszukiwań, w tym dziesięć słowiańskich; WS3 i WS4 po około 20). Następnie pięciu silniejszych weryfikatorów ponownie otworzyło źródła. Zasadę „co najmniej pięć iteracji, zanim uznamy, że danych nie ma” zastosowano do każdego wyniku negatywnego.

Nieznalezione po wymaganych iteracjach:

- Badanie z 2026 roku porównujące **ten sam model, zadanie i dane po polsku i po angielsku** w wyszukiwaniu, RAG lub zadaniach agentowych.
- Polski w jakimkolwiek benchmarku agentowym lub wywoływania narzędzi z lat 2025–2026 (MAPS, OmnilingualGAIA2, tau-bench-LILT i MLCL go pomijają).
- Wyniki per język w długim kontekście dla modeli frontowych od dostawców.
- Pomiar efektywnej długości kontekstu dla polskiego.

Znalezione, ale słabsze, niż liczyliśmy (traktuj jako tropy, nie dowody): wyniki Open PL LLM Leaderboard (zbiór zwraca 401, więc niedostępne); wyniki PolEval 2026 (jeszcze nieopublikowane); wyszukiwania w języku słowackim, serbskim, chorwackim i bułgarskim (tylko częściowe); raporty CLARIN-PL, IPI PAN i NASK z 2026 roku (nie znaleziono).

Niesprawdzone: tabele per język GPT-5.x, Claude i Qwen3.x w kartach systemowych dostawców (PDF-y nieczytelne); arXiv 2412.00559 (transfer polsko-angielski w medycynie, możliwe źródło porównania równego); działające rankingi MTEB, PIRB i PL-MTEB.

## 6. Poprawki wprowadzone podczas weryfikacji

- Etykieta „Claude Opus-4-5 none” we wczesnym raporcie agenta była błędna: kolumna Claude bez rozumowania w mmPISA to Haiku 4.5, a kolumna z wysokim wysiłkiem to Opus 4.5.
- Kierunek luk w OmnilingualGAIA2 był odwrócony w pierwszym zapisie; angielski jest wyższym wynikiem wszędzie.
- Średnie BM25 z BEIR-PL przeliczyliśmy sami z tabeli 3, nie są wydrukowane w pracy.
- „COLM 2025” dla OneRuler jest niepotwierdzone.
- 2503.00995 to „Evaluating Polish linguistic and cultural competency in LLMs”, a nie polska praca o RAG typu igła w stogu siana.
- Nagłówek „rosyjski 4× droższy” jest nieuzasadniony: źródłem jest mały, samodzielnie zbudowany korpus, a 3,9× porównuje dwa modele na rosyjskim, a nie rosyjski z angielskim.
- LLMzSzŁ (arXiv 2501.02266) nie jest porównaniem równym polski–angielski.
- 81,5% preferencji dla Bielika dotyczy tylko korzystnej kolejności.
- Wcześniejsza flaga przy arXiv 2609.39001 („podejrzany identyfikator”) była błędna; praca istnieje.
- Tokka-Bench (2610.08794) ma datę zgłoszenia 25.03.2026, co koliduje z identyfikatorem; nie cytujemy go tutaj.

## 7. Wnioski praktyczne dla zespołu

- Nie wybieraj języka promptu na podstawie „polski bije angielski”. Jeśli użytkownik i dokumenty są po polsku, zostaw je po polsku: nie ma dowodu, że tłumaczenie na angielski pomaga mocnym modelom rozumującym, a mieszane korpusy w RAG mogą faworyzować dokumenty angielskie.
- Dla mniejszych lub starszych modeli, wykonywania instrukcji i wieloetapowych zadań agentowych spodziewaj się straty od kilku do około 15 pkt po polsku i sprawdź to na własnych danych.
- Zakładaj około 1,8× tokenów dla polskiego tekstu (koszt i kontekst). Tokenizer przystosowany do polskiego (Bielik, PLLuM) to zmienia.
- Zbuduj własną małą ewaluację parową: 30–50 zadań napisanych w obu językach, uruchomionych na używanym modelu i poziomie wysiłku rozumowania, po pięć przebiegów, i porównaj. To tanie i odpowiada na pytanie dla waszego stosu tam, gdzie żaden opublikowany benchmark nie obejmuje polskiego.

Wskazówki Claude Code do takiej pracy (dla kursu):

- Trzymaj brief badawczy (zakres, reguły źródeł, format raportu, minimalna liczba iteracji) jako **skill**, na przykład `/research-fanout`, żeby kolejne badanie wymagało tylko tematu.
- Reguły źródeł i weryfikacji trzymaj w zagnieżdżonym `CLAUDE.md` lub `AGENTS.md` w folderze badań, a nie w pliku głównym.
- Używaj tańszego modelu do szerokiego zbierania i silniejszego do weryfikacji, jak tutaj. Weryfikatorom każ otwierać dokument źródłowy, a nie ufać raportowi.
- Przydatne narzędzia do dodania: serwer MCP dla arXiv lub Semantic Scholar do sprawdzania cytowań oraz CLI do zamiany PDF na tekst, np. `pdftotext`, bo kilka sprawdzeń tutaj nie powiodło się na nieczytelnych PDF-ach.

## 8. Metoda i ograniczenia

- Przebieg: ustalenie źródła, sześciu agentów badawczych (Haiku) z osobnymi zakresami, pięciu agentów weryfikujących (Sonnet), którzy ponownie otworzyli dokumenty pierwotne, a następnie ten raport napisany przez agenta koordynującego.
- Strony czytano przez streszczacz stron WWW, a nie przez surowy tekst PDF. Kolumny tabel mapowali czytelnicy i sprawdzano je krzyżowo tam, gdzie zgodziło się dwóch. Wartości z rysunków to odczyty wizualne.
- Wiele prac z 2026 roku to preprinty bez recenzji. Z recenzją: Marco-Bench-MIF (ACL 2025), PolyMath (NeurIPS 2025), Barua i in. (ICLR 2026), Linguistic Nepotism (ICML 2026 spotlight), CUS-QA (TACL 2026), prace EACL i LREC 2026, Kang i in. (Findings ACL 2026). OneRuler to preprint (miejsce publikacji niepotwierdzone).
- Nie użyto danych uczestników ani poświadczeń. Nic nie zostało wypchnięte ani zacommitowane.
