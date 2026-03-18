"use client";

import { useState } from "react";
import { VitalInfo } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { upsertVitalInfo } from "@/lib/actions/vital-info";
import { toast } from "sonner";
import {
  Pill,
  AlertTriangle,
  Stethoscope,
  Shield,
  Phone,
  Heart,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";

const categoryIcons: Record<string, React.ReactNode> = {
  Medications: <Pill className="h-5 w-5 text-blue-600" />,
  Allergies: <AlertTriangle className="h-5 w-5 text-red-600" />,
  Doctors: <Stethoscope className="h-5 w-5 text-green-600" />,
  Insurance: <Shield className="h-5 w-5 text-purple-600" />,
  "Emergency Contacts": <Phone className="h-5 w-5 text-orange-600" />,
};

export function VitalInfoClient({ items }: { items: VitalInfo[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  function startEdit(item: VitalInfo) {
    setEditingId(item.id);
    setEditContent(item.content);
  }

  async function handleSave(category: string) {
    try {
      await upsertVitalInfo(category, editContent);
      setEditingId(null);
      toast.success("Updated!");
    } catch {
      toast.error("Failed to save");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Health Info</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Medications, allergies, doctors & more
      </p>

      <div className="space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Heart}
            message="No health info yet. Add medications, allergies, and more to keep your family informed."
          />
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  {categoryIcons[item.category] ?? (
                    <Pill className="h-5 w-5 text-gray-500" />
                  )}
                  <CardTitle className="text-base">{item.category}</CardTitle>
                </div>
                {editingId === item.id ? (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSave(item.category)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startEdit(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingId === item.id ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/80 leading-relaxed">
                    {item.content}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
