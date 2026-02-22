import { Moon, Star } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 relative overflow-hidden">
      {/* Decorative stars */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-yellow-300/20 animate-pulse"
            size={Math.random() * 12 + 6}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
            fill="currentColor"
          />
        ))}
      </div>

      <div className="text-center z-10 px-6">
        {/* Crescent Moon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Moon
              className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]"
              size={80}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Arabic greeting */}
        <p className="text-yellow-400/90 text-2xl md:text-3xl font-light mb-3" style={{ fontFamily: 'serif' }}>
          رمضان كريم
        </p>

        {/* English greeting */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
          Ramadan Kareem
        </h1>

        <p className="text-emerald-200/70 text-lg md:text-xl max-w-md mx-auto mb-8">
          Wishing all Muslims a blessed and peaceful holy month 🤲
        </p>

        {/* Tennahub branding */}
        <div className="mt-10 border-t border-emerald-700/40 pt-6">
          <p className="text-emerald-300/50 text-sm tracking-widest uppercase">
            tennahub
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
