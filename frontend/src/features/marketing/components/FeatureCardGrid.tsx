import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FeatureCardItem {
  title: string;
  description: string;
}

interface FeatureCardGridProps {
  items: FeatureCardItem[];
}

export function FeatureCardGrid({ items }: FeatureCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.title} className="transition-transform duration-200 hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-lg">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{item.description}</CardContent>
        </Card>
      ))}
    </div>
  );
}
