"use client";

import { useEffect, useState } from "react";

interface ClientDateTimeProps {
  timestamp: number;
  className?: string;
}

function formatLocalDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function ClientDateTime({
  timestamp,
  className,
}: ClientDateTimeProps) {
  // Use a stable UTC value for SSR, then switch to the browser's locale.
  const [formattedDate, setFormattedDate] = useState(() =>
    new Date(timestamp).toISOString().slice(0, 16).replace("T", " "),
  );

  useEffect(() => {
    setFormattedDate(formatLocalDateTime(timestamp));
  }, [timestamp]);

  return (
    <time
      className={className}
      dateTime={new Date(timestamp).toISOString()}
      title={new Date(timestamp).toISOString()}
      suppressHydrationWarning
    >
      {formattedDate}
    </time>
  );
}
