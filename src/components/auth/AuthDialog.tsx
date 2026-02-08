import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const loading = useAuthStore((s) => s.loading);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!email.trim()) return;
    setError(null);
    try {
      await signInWithEmail(email.trim());
      setStep("otp");
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    }
  }, [email, signInWithEmail, startCooldown]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) return;
    setError(null);
    try {
      await verifyOtp(email.trim(), otp);
      onOpenChange(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
      setOtp("");
    }
  }, [otp, email, verifyOtp, onOpenChange]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      await signInWithEmail(email.trim());
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
    }
  }, [email, signInWithEmail, resendCooldown, startCooldown]);

  const resetState = useCallback(() => {
    setStep("email");
    setEmail("");
    setOtp("");
    setError(null);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {step === "email" ? "Sign in to Hermes" : "Enter verification code"}
          </DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "Enter your email to receive a sign-in code"
              : `We sent a 6-digit code to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCode();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                ref={emailInputRef}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Mail className="size-4 mr-2" />
              )}
              Send Code
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerify}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              className="w-full"
              disabled={loading || otp.length !== 6}
              onClick={handleVerify}
            >
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              Verify
            </Button>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
              >
                <ArrowLeft className="size-3 mr-1" />
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={resendCooldown > 0 || loading}
                onClick={handleResend}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
