import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TestimonialCardProps {
  name: string;
  businessName?: string;
  role?: string;
  content: string;
  rating?: number;
  photoUrl?: string;
}

export const TestimonialCard = ({
  name,
  businessName,
  role,
  content,
  rating = 5,
  photoUrl,
}: TestimonialCardProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="h-full bg-card hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6 flex flex-col h-full">
        <Quote className="h-8 w-8 text-primary/20 mb-4" />
        
        {/* Rating */}
        {rating && (
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted"
                }`}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <p className="text-muted-foreground flex-1 mb-6 italic">
          "{content}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Avatar className="h-12 w-12">
            <AvatarImage src={photoUrl} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            {(businessName || role) && (
              <p className="text-sm text-muted-foreground">
                {role && <span>{role}</span>}
                {role && businessName && <span> at </span>}
                {businessName && <span className="font-medium">{businessName}</span>}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
