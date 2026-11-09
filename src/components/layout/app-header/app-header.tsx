import Link from "next/link";
import { ExternalLink } from "lucide-react";

import styles from "./app-header.module.css";

// Navigation metadata keeps internal and external link behavior consistent.
const navigation = [
  { label: "Dashboard", href: "#dashboard", icon: null, external: false },
  {
    label: "Alda Gonçalves",
    href: "https://aldagoncalves.online",
    icon: ExternalLink,
    external: true,
  },
];

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <nav className={styles.navigation} aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon, external }, index) => (
            <Link
              key={label}
              href={href}
              className={styles.navigationLink}
              data-active={index === 0}
              aria-current={index === 0 ? "location" : undefined}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
            >
              {Icon && <Icon size={15} aria-hidden="true" />}
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
