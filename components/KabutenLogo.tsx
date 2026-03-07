import styles from './KabutenLogo.module.css';

type Size = 'gate' | 'landing' | 'nav';

export default function KabutenLogo({ size = 'nav' }: { size?: Size }) {
  const fontSize = size === 'gate' ? 72 : size === 'landing' ? 42 : 36;
  return (
    <span className={styles.logo} style={{ fontSize, letterSpacing: 4 }}>
      KABUTEN
    </span>
  );
}
