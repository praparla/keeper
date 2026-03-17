"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/lib/actions/user";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

interface UserSettings {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  emailReminders: boolean;
  smsReminders: boolean;
}

export function SettingsClient({ user }: { user: UserSettings }) {
  const [phone, setPhone] = useState(user.phoneNumber);
  const [emailReminders, setEmailReminders] = useState(user.emailReminders);
  const [smsReminders, setSmsReminders] = useState(user.smsReminders);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({
        phoneNumber: phone,
        emailReminders,
        smsReminders,
      });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Manage your profile and notifications
      </p>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email || "N/A"} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-reminders">Email Reminders</Label>
              <Switch
                id="email-reminders"
                checked={emailReminders}
                onCheckedChange={setEmailReminders}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-reminders">Text Reminders</Label>
              <Switch
                id="sms-reminders"
                checked={smsReminders}
                onCheckedChange={setSmsReminders}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
