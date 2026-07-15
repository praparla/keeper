"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createInvite } from "@/lib/actions/circle";
import { updateProfile } from "@/lib/actions/user";
import { toast } from "sonner";
import { Link2, LogOut } from "lucide-react";

interface UserSettings {
  name: string;
  email: string;
  timezone: string;
  digestEmail: boolean;
  immediateEmail: boolean;
  weeklyEmail: boolean;
}

export function SettingsClient({ user, circleName }: { user: UserSettings; circleName: string }) {
  const [timezone, setTimezone] = useState(user.timezone);
  const [digestEmail, setDigestEmail] = useState(user.digestEmail);
  const [immediateEmail, setImmediateEmail] = useState(user.immediateEmail);
  const [weeklyEmail, setWeeklyEmail] = useState(user.weeklyEmail);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ timezone, digestEmail, immediateEmail, weeklyEmail });
      toast.success("Settings saved!");
    } catch (error) {
      console.error("Failed to save settings", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    try {
      const { url } = await createInvite();
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    } catch (error) {
      console.error("Failed to create invite", error);
      toast.error("Failed to create invite");
    }
  }

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      console.error("Failed to sign out", error);
      toast.error("Failed to sign out");
      return;
    }
    window.location.href = "/login";
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Settings</h1>
      <p className="mb-4 text-sm text-muted-foreground">{circleName}</p>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={user.name} disabled className="bg-muted" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user.email} disabled className="bg-muted" /></div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Email</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SettingSwitch id="digest" label="Morning digest" checked={digestEmail} setChecked={setDigestEmail} />
            <SettingSwitch id="immediate" label="Urgent and assigned" checked={immediateEmail} setChecked={setImmediateEmail} />
            <SettingSwitch id="weekly" label="Weekly lookahead" checked={weeklyEmail} setChecked={setWeeklyEmail} />
          </CardContent>
        </Card>
        <Button onClick={handleSave} className="w-full" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        <Button variant="outline" className="w-full" onClick={handleInvite}><Link2 className="mr-2 h-4 w-4" />Copy family invite</Button>
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />Sign Out
        </Button>
      </div>
    </div>
  );
}

function SettingSwitch({ id, label, checked, setChecked }: { id: string; label: string; checked: boolean; setChecked: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between"><Label htmlFor={id}>{label}</Label><Switch id={id} checked={checked} onCheckedChange={setChecked} /></div>;
}
