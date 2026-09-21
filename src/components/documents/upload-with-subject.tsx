"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { SUBJECTS } from "@/lib/documents/subjects";

export function UploadWithSubject() {
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);

  return (
    <div className="space-y-3">
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="upload-subject">Matière</Label>
        <Select value={subject} onValueChange={(value) => setSubject(value ?? SUBJECTS[0])}>
          <SelectTrigger id="upload-subject" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <UploadDropzone subject={subject} />
    </div>
  );
}
