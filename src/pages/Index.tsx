import { useLanguage } from "@/i18n";

const Index = () => {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 relative overflow-hidden">
      <div className="text-center z-10 px-6">
        <div className="border border-emerald-700/40 rounded-2xl p-8 backdrop-blur-sm bg-emerald-900/20">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            {t.pages.index.title}
          </h1>
          <p className="text-emerald-200/70 text-lg md:text-xl max-w-md mx-auto">
            {t.pages.index.subtitle}
          </p>
          <div className="mt-8 pt-6 border-t border-emerald-700/40">
            <p className="text-emerald-300/50 text-sm tracking-widest uppercase">
              {t.navigation.company}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
