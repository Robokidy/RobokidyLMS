import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UsernameField({ value, seed, onChange }: { value: string; seed: string; onChange: (value: string) => void }) {
  const [message, setMessage] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!value) {
      setMessage("");
      setAvailable(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      const result = await apiFetch(`/auth/username?username=${encodeURIComponent(value)}`);
      setAvailable(result.available);
      setMessage(result.message);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value]);

  const generate = async () => {
    const result = await apiFetch(`/auth/username?seed=${encodeURIComponent(seed || "user")}`);
    onChange(result.username || result.suggested);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Username</Label>
        <Button type="button" size="sm" variant="ghost" onClick={generate}>Generate</Button>
      </div>
      <Input value={value} onChange={(event) => onChange(event.target.value.toLowerCase())} placeholder="name@robokidy" />
      {message && <p className={`text-xs ${available ? "text-emerald-600" : "text-destructive"}`}>{message}</p>}
    </div>
  );
}
