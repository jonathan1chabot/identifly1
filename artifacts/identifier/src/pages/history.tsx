import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetIdentifyHistory, getGetIdentifyHistoryQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Microscope, ImageOff } from "lucide-react";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { data: history, isLoading } = useGetIdentifyHistory();

  // Refetch history when navigating to this page
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: getGetIdentifyHistoryQueryKey() });
  }, [queryClient]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">Field Notes</h1>
            <p className="text-muted-foreground">A record of your past discoveries and identifications.</p>
          </div>
          <Badge variant="secondary" className="w-fit text-sm font-medium px-3 py-1">
            {history?.length || 0} Records
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-border/50">
                <div className="h-48 bg-muted animate-pulse" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
            {history.map((record) => (
              <Card key={record.id} className="group overflow-hidden border-border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
                <div className="h-48 bg-muted relative flex items-center justify-center border-b border-border/50">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-secondary/20 group-hover:opacity-50 transition-opacity" />
                  <Microscope className="w-12 h-12 text-muted-foreground/30" />
                  {/* Note: The API doesn't return the original image URL in the history record based on the schema, 
                      so we use a stylish placeholder. In a real app with cloud storage, we'd show the image here. */}
                </div>
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-background text-muted-foreground">
                      {record.category}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {Math.round(record.confidence * 100)}% Match
                    </span>
                  </div>
                  
                  <h3 className="font-serif font-bold text-xl text-foreground mb-3 leading-tight group-hover:text-primary transition-colors">
                    {record.name}
                  </h3>
                  
                  <div className="mt-auto pt-4 space-y-4">
                    {record.tags && record.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {record.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-secondary/50 text-secondary-foreground rounded-md">
                            {tag}
                          </span>
                        ))}
                        {record.tags.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                            +{record.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
                      Identified {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
            <div className="bg-secondary p-4 rounded-full mb-4">
              <ImageOff className="w-8 h-8 text-secondary-foreground" />
            </div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">No discoveries yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your field notebook is empty. Head back to the identify page to analyze your first image.
            </p>
            <Badge variant="outline" className="px-4 py-1.5 text-sm cursor-pointer hover:bg-secondary hover:text-secondary-foreground transition-colors" onClick={() => window.location.href = "/"}>
              Start Identifying
            </Badge>
          </div>
        )}
      </div>
    </Layout>
  );
}
