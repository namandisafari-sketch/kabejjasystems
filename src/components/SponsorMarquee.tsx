import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
}

export function SponsorMarquee() {
  const { data: sponsors, isLoading } = useQuery({
    queryKey: ['public-sponsors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsors')
        .select('id, name, logo_url, website_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Sponsor[];
    },
  });

  if (isLoading || !sponsors || sponsors.length === 0) {
    return null;
  }

  // Duplicate sponsors for seamless infinite scroll
  const duplicatedSponsors = [...sponsors, ...sponsors];

  return (
    <section className="py-6 overflow-hidden bg-black border-y border-border/50">
      <div className="max-w-2xl mx-auto px-4 mb-4 text-center">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
          Our Sponsors & Partners
        </h3>
      </div>
      
      <div className="relative">
        {/* Gradient overlays for smooth fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        
        {/* Marquee container */}
        <div className="flex animate-marquee">
          {duplicatedSponsors.map((sponsor, index) => (
            <a
              key={`${sponsor.id}-${index}`}
              href={sponsor.website_url || '#'}
              target={sponsor.website_url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex-shrink-0 mx-6 sm:mx-10 flex items-center justify-center h-16 w-32 sm:w-40 grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300"
              title={sponsor.name}
            >
              <img
                src={sponsor.logo_url}
                alt={sponsor.name}
                className="max-h-12 max-w-full object-contain"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
