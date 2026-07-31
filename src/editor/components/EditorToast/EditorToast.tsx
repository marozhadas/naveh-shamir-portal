"use client";

import { AlertTriangle, Check } from "lucide-react";
import styles from "./EditorToast.module.css";

type EditorToastProps = {
  message: string;
  tone: "success" | "error";
};

export function EditorToast({ message, tone }: EditorToastProps) {
  return (
    <div
      className={`${styles.toast} ${tone === "success" ? styles.success : styles.error}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      {tone === "success" ? <Check size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
      {message}
    </div>
  );
}
