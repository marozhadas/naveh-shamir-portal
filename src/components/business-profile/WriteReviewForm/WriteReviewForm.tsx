"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { submitBusinessReviewAction, type SubmitReviewState } from "@/app/businesses/[slug]/review-actions";
import { countWords, MAX_REVIEW_WORDS } from "@/utils/word-count";
import styles from "./WriteReviewForm.module.css";

const INITIAL_STATE: SubmitReviewState = { status: "idle" };

type WriteReviewFormProps = {
  businessId: string;
};

export function WriteReviewForm({ businessId }: WriteReviewFormProps) {
  const boundAction = submitBusinessReviewAction.bind(null, businessId);
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL_STATE);
  const [content, setContent] = useState("");
  const nameId = useId();
  const contentId = useId();
  const wordCount = countWords(content);
  const overLimit = wordCount > MAX_REVIEW_WORDS;

  if (state.status === "success") {
    return (
      <p className={styles.successBox} role="status">
        תודה! הביקורת נשלחה ותוצג באתר לאחר אישור צוות הפורטל.
      </p>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {/* Hidden honeypot — real visitors never see or fill this field. */}
      <div className={styles.honeypotField} aria-hidden="true">
        <label htmlFor="review-website">אתר</label>
        <input id="review-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.field}>
        <label htmlFor={nameId}>שם</label>
        <input id={nameId} name="authorName" type="text" required maxLength={80} />
        {state.fieldErrors?.authorName?.map((message) => (
          <p key={message} className={styles.fieldError}>
            {message}
          </p>
        ))}
      </div>

      <div className={styles.field}>
        <label htmlFor={contentId}>תוכן הביקורת</label>
        <textarea id={contentId} name="content" rows={4} required value={content} onChange={(event) => setContent(event.target.value)} />
        <p className={overLimit ? styles.wordCountOver : styles.wordCount}>
          {wordCount} / {MAX_REVIEW_WORDS} מילים
        </p>
        {state.fieldErrors?.content?.map((message) => (
          <p key={message} className={styles.fieldError}>
            {message}
          </p>
        ))}
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className={styles.fieldError} role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="accent" size="compact" disabled={isPending || overLimit}>
        {isPending ? "שולח…" : "שליחת ביקורת"}
      </Button>
    </form>
  );
}
