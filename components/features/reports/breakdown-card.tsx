import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BreakdownCard({ title, counts }: { title: string; counts: Map<string, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {counts.size === 0 ? (
          <p className="text-sm text-gray-500">No data yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...counts.entries()].map(([label, count]) => (
              <div key={label}>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-sm capitalize text-gray-500">{label.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
