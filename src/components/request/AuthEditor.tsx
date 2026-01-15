import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { RequestAuth } from "@/types/request";

interface AuthEditorProps {
  auth: RequestAuth;
  onChange: (auth: RequestAuth) => void;
}

const AUTH_TYPES = [
  { value: "none", label: "No Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "apikey", label: "API Key" },
] as const;

function defaults(type: string): RequestAuth {
  switch (type) {
    case "bearer":
      return { type: "bearer", token: "" };
    case "basic":
      return { type: "basic", username: "", password: "" };
    case "apikey":
      return { type: "apikey", key: "", value: "", addTo: "header" };
    default:
      return { type: "none" };
  }
}

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select
          value={auth.type}
          onValueChange={(type) => onChange(defaults(type))}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTH_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {auth.type === "none" && (
        <p className="text-xs text-muted-foreground">
          This request does not use any authentication.
        </p>
      )}

      {auth.type === "bearer" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Token</Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={auth.token}
              onChange={(e) =>
                onChange({ ...auth, token: e.target.value })
              }
              placeholder="Enter bearer token"
              className="pr-9 font-mono text-xs h-8"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute right-1 top-1"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="size-3" />
              ) : (
                <Eye className="size-3" />
              )}
            </Button>
          </div>
        </div>
      )}

      {auth.type === "basic" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Username</Label>
            <Input
              value={auth.username}
              onChange={(e) =>
                onChange({ ...auth, username: e.target.value })
              }
              placeholder="Username"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={auth.password}
                onChange={(e) =>
                  onChange({ ...auth, password: e.target.value })
                }
                placeholder="Password"
                className="pr-9 font-mono text-xs h-8"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute right-1 top-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="size-3" />
                ) : (
                  <Eye className="size-3" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {auth.type === "apikey" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Key</Label>
            <Input
              value={auth.key}
              onChange={(e) =>
                onChange({ ...auth, key: e.target.value })
              }
              placeholder="e.g. X-API-Key"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Value</Label>
            <Input
              value={auth.value}
              onChange={(e) =>
                onChange({ ...auth, value: e.target.value })
              }
              placeholder="Enter API key value"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Add to</Label>
            <Select
              value={auth.addTo}
              onValueChange={(addTo: "header" | "query") =>
                onChange({ ...auth, addTo })
              }
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="query">Query Param</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
