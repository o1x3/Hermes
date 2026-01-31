import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface RenameInputProps {
  value: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

export function RenameInput({ value, onSave, onCancel }: RenameInputProps) {
  const [name, setName] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <Input
      ref={inputRef}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSubmit();
        if (e.key === "Escape") onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-6 text-xs px-1.5 py-0"
      autoFocus
    />
  );
}
