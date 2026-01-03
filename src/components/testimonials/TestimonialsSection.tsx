import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { TestimonialCard } from "./TestimonialCard";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export const TestimonialsSection = () => {
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["approved-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Real Stories from Real Businesses
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Hear from Ugandan business owners who have transformed their operations with Kabejja Systems
          </p>
          <Link to="/submit-testimonial">
            <Button variant="outline" className="gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Share Your Experience
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : testimonials && testimonials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                name={testimonial.name}
                businessName={testimonial.business_name || undefined}
                role={testimonial.role || undefined}
                content={testimonial.content}
                rating={testimonial.rating || 5}
                photoUrl={testimonial.photo_url || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border-2 border-dashed">
            <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Be the First to Share Your Story
            </h3>
            <p className="text-muted-foreground mb-4">
              Have you used Kabejja Systems? Share your experience and help other businesses discover us.
            </p>
            <Link to="/submit-testimonial">
              <Button>Submit Your Testimonial</Button>
            </Link>
          </div>
        )}

        {testimonials && testimonials.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              All testimonials are from verified Kabejja Systems users
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
