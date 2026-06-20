import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Star, School, CheckCircle2, Loader2, UserCheck } from "lucide-react";

async function getCanvasFingerprint(): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 50;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillStyle = "#f60";
  ctx.fillRect(0, 0, 200, 50);
  ctx.fillStyle = "#069";
  ctx.fillText("TennaHubReview", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("StaffReview", 4, 35);
  const dataUrl = canvas.toDataURL();
  let hash = 0;
  for (let i = 0; i < dataUrl.length; i++) {
    const char = dataUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

interface TenantInfo {
  id: string;
  name: string;
}

interface DeviceFingerprint {
  userAgent: string;
  language: string;
  screenResolution: string;
  canvasFingerprint: string;
}

const reviewSchema = z.object({
  student_name: z.string().min(1, "Your name is required"),
  staff_name: z.string().min(1, "Staff member name is required"),
  rating: z.number().min(1, "Please select a rating").max(5),
  review: z.string().min(10, "Review must be at least 10 characters"),
  is_anonymous: z.boolean().optional().default(false),
});

type ReviewForm = z.infer<typeof reviewSchema>;

const StaffReviews = () => {
  const [schoolCode, setSchoolCode] = useState("");
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      student_name: "",
      staff_name: "",
      rating: 0,
      review: "",
      is_anonymous: false,
    },
  });

  const collectFingerprint = useCallback(async () => {
    const fp: DeviceFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      canvasFingerprint: await getCanvasFingerprint(),
    };
    setDeviceFingerprint(fp);
    return fp;
  }, []);

  const lookupSchool = async () => {
    const code = schoolCode.trim();
    if (!code) return;

    setIsLookingUp(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("business_code", code)
        .single();

      if (error || !data) {
        toast.error("School not found");
        setTenant(null);
        return;
      }

      setTenant(data);
      await collectFingerprint();
      toast.success(`Found: ${data.name}`);
    } catch {
      toast.error("School not found");
      setTenant(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const onSubmit = async (data: ReviewForm) => {
    if (!tenant) {
      toast.error("Please enter a valid school code first");
      return;
    }

    if (!deviceFingerprint) {
      toast.error("Could not capture device information");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("staff_reviews").insert({
        tenant_id: tenant.id,
        school_code: schoolCode.trim(),
        device_fingerprint: JSON.stringify(deviceFingerprint),
        student_name: data.is_anonymous ? "Anonymous" : data.student_name,
        staff_name: data.staff_name,
        rating: data.rating,
        review: data.review,
        is_anonymous: data.is_anonymous,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Your review has been submitted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
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
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription>
              Your review has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Your feedback helps us improve the quality of education at {tenant?.name}.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setTenant(null);
                setSchoolCode("");
                setDeviceFingerprint(null);
                setIsSubmitted(false);
                form.reset();
              }}
            >
              Submit Another Review
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <School className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Staff Reviews</CardTitle>
            </div>
            <CardDescription>
              Share your experience with a staff member at your school.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* School Code Lookup */}
            <div className="space-y-2">
              <label className="text-sm font-medium">School Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your school code"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  onBlur={lookupSchool}
                  disabled={isLookingUp}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={lookupSchool}
                  disabled={isLookingUp || !schoolCode.trim()}
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* School Found */}
            {tenant && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm font-medium text-center">
                {tenant.name}
              </div>
            )}

            {/* Review Form */}
            {tenant && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="student_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="staff_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Member Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Staff member name" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating *</FormLabel>
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
                                disabled={isSubmitting}
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
                    name="review"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Review *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share your experience with this staff member..."
                            className="min-h-[120px]"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_anonymous"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Submit anonymously
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
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

export default StaffReviews;
