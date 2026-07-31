import styles from "./SectionHeader.module.css";

type SectionHeaderProps = {
  id?: string;
  children: string;
};

export function SectionHeader({ id, children }: SectionHeaderProps) {
  return (
    <h2 id={id} className={styles.heading}>
      {children}
    </h2>
  );
}
