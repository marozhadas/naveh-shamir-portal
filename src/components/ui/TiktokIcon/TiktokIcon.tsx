type TiktokIconProps = {
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
};

/** The TikTok musical-note glyph, monochrome (inherits currentColor) to match a plain text link/pill. */
export function TiktokIcon({ size = 15, "aria-hidden": ariaHidden = true }: TiktokIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden={ariaHidden}>
      <path d="M16.6 5.82c-1.32-.9-2.22-2.34-2.42-3.99A5.34 5.34 0 0 1 14.13 1h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V7.7c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}
