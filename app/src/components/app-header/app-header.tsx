export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background md:h-20">
      <div className="mx-auto flex h-full w-full max-w-[1360px] items-center px-4 md:px-8">
        <p className="text-xl font-bold text-primary md:text-2xl">
          Hardware Service Decision Copilot
        </p>
      </div>
    </header>
  );
}
