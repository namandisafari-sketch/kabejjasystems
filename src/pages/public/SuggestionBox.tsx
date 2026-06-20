import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Lightbulb, School, CheckCircle2, Loader2 } from "lucide-react";

const schoolCodeSchema = z.object({
  schoolCode: z.string().min(1, "School code is required"),
});

const suggestionSchema = z.object({
  submitter_name: z.string().min(2, "Name must be at least 2 characters"),
  submitter_email: z.string().email("Invalid email").optional().or(z.literal("")),
  submitter_phone: z.string().optional(),
  category: z.string().min(1, "Please select a category"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type SchoolCodeForm = z.infer<typeof schoolCodeSchema>;
type SuggestionForm = z.infer<typeof suggestionSchema>;

const categories = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic" },
  { value: "facilities", label: "Facilities" },
  { value: "safety", label: "Safety" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const SuggestionBox = () => {
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const codeForm = useForm<SchoolCodeForm>({
    resolver: zodResolver(schoolCodeSchema),
    defaultValues: { schoolCode: "" },
  });

  const suggestionForm = useForm<SuggestionForm>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      submitter_name: "",
      submitter_email: "",
      submitter_phone: "",
      category: "",
      message: "",
    },
  });

  const lookupSchool = async (code: string) => {
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
    } catch {
      toast.error("School not found");
      setTenant(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const onSubmitSchoolCode = async (data: SchoolCodeForm) => {
    await lookupSchool(data.schoolCode);
  };

  const onSubmitSuggestion = async (data: SuggestionForm) => {
    if (!tenant) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("suggestions").insert({
        tenant_id: tenant.id,
        submitter_name: data.submitter_name,
        submitter_email: data.submitter_email || null,
        submitter_phone: data.submitter_phone || null,
        category: data.category,
        message: data.message,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Your suggestion has been received!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit suggestion");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-base">
              Your suggestion has been received.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We appreciate you taking the time to share your thoughts with {tenant?.name}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Suggestion Box</CardTitle>
          <CardDescription>
            Share your ideas to help make your school better
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tenant ? (
            <Form {...codeForm}>
              <form
                onSubmit={codeForm.handleSubmit(onSubmitSchoolCode)}
                className="space-y-4"
              >
                <FormField
                  control={codeForm.control}
                  name="schoolCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your school code"
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            if (e.target.value.trim()) {
                              lookupSchool(e.target.value.trim());
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLookingUp}>
                  {isLookingUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <School className="mr-2 h-4 w-4" />
                      Find School
                    </>
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6 p-3 bg-muted rounded-lg">
                <School className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitting a suggestion
                  </p>
                </div>
              </div>

              <Form {...suggestionForm}>
                <form
                  onSubmit={suggestionForm.handleSubmit(onSubmitSuggestion)}
                  className="space-y-4"
                >
                  <FormField
                    control={suggestionForm.control}
                    name="submitter_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={suggestionForm.control}
                      name="submitter_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={suggestionForm.control}
                      name="submitter_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+256 700 000000"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={suggestionForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={suggestionForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Suggestion *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share your suggestion or idea..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Suggestion"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuggestionBox;
