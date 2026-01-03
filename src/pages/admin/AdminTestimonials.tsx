import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/hooks/use-database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Star, Loader2, MessageSquare, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";

const AdminTestimonials = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials", activeTab],
    queryFn: async () => {
      let query = db.from("testimonials").select("*").order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("is_approved", false);
      } else if (activeTab === "approved") {
        query = query.eq("is_approved", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured?: boolean }) => {
      const { data: { user } } = await db.auth.getUser();
      const { error } = await db
        .from("testimonials")
        .update({
          is_approved: true,
          is_featured: featured || false,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Testimonial approved");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve testimonial");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Testimonial rejected and removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject testimonial");
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await db
        .from("testimonials")
        .update({ is_featured: featured })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast.success("Testimonial updated");
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Testimonials</h1>
        <p className="text-muted-foreground">Review and manage customer testimonials</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : testimonials && testimonials.length > 0 ? (
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {testimonial.name}
                          {testimonial.is_featured && (
                            <Badge variant="secondary" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {testimonial.role && `${testimonial.role} `}
                          {testimonial.business_name && `at ${testimonial.business_name}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {testimonial.is_approved ? (
                          <Badge className="bg-green-500">Approved</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating */}
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < (testimonial.rating || 0)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Content */}
                    <p className="text-foreground italic">&quot;{testimonial.content}&quot;</p>

                    {/* Proof */}
                    {testimonial.proof_description && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-1">Usage Description:</p>
                        <p className="text-sm text-muted-foreground">{testimonial.proof_description}</p>
                      </div>
                    )}

                    {/* Meta */}
                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(testimonial.created_at), "PPP 'at' p")}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {!testimonial.is_approved && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: testimonial.id })}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => approveMutation.mutate({ id: testimonial.id, featured: true })}
                            disabled={approveMutation.isPending}
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Approve & Feature
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(testimonial.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {testimonial.is_approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleFeaturedMutation.mutate({
                              id: testimonial.id,
                              featured: !testimonial.is_featured,
                            })
                          }
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          {testimonial.is_featured ? "Remove from Featured" : "Mark as Featured"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No testimonials found in this category.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTestimonials;
