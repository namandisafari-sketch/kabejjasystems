import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft, Star, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n";

const testimonialSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z.string().optional(),
  role: z.string().optional(),
  content: z.string().min(20, "Please share at least 20 characters about your experience"),
  rating: z.number().min(1).max(5),
  proofDescription: z.string().min(10, "Please describe how you use TennaHub Technologies"),
});

type TestimonialForm = z.infer<typeof testimonialSchema>;

const SubmitTestimonial = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<TestimonialForm>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: "",
      businessName: "",
      role: "",
      content: "",
      rating: 5,
      proofDescription: "",
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: TestimonialForm) => {
    if (!user) {
      toast.error(t.auth.login);
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("testimonials").insert({
        submitter_id: user.id,
        name: data.name,
        business_name: data.businessName || null,
        role: data.role || null,
        content: data.content,
        rating: data.rating,
        proof_description: data.proofDescription,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success(t.common.success);
    } catch (error: any) {
      toast.error(error.message || t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">{t.common.success}</CardTitle>
            <CardDescription>
              {t.pages.pendingApproval.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              {t.common.description}
            </p>
            <Link to="/">
              <Button className="w-full">{t.pages.notFound.returnHome}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t.common.back}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t.common.description}</CardTitle>
            <CardDescription>
              {t.pages.pendingApproval.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t.auth.login}
                </p>
                <Link to="/login">
                  <Button>{t.auth.login}</Button>
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.common.name} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t.common.name} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.common.name}</FormLabel>
                          <FormControl>
                            <Input placeholder={t.common.name} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.staff.role}</FormLabel>
                          <FormControl>
                            <Input placeholder={t.staff.role} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.common.type} *</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => field.onChange(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`h-8 w-8 transition-colors ${
                                    star <= (hoveredRating || field.value)
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-muted hover:text-yellow-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.common.description} *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t.common.description}
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t.common.notes}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="proofDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.common.description} *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t.common.description}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t.common.notes}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.common.submit}...
                      </>
                    ) : (
                      t.common.submit
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitTestimonial;
