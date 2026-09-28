import { useEffect, useState } from "react";

export function Watermark() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const showWatermarkEnv = import.meta.env['VITE_SHOW_WATERMARK'];
    if (showWatermarkEnv !== undefined) {
      setIsDev(showWatermarkEnv === "true");
    } else {
      setIsDev(import.meta.env.MODE === "development" || import.meta.env.DEV);
    }
  }, []);

  if (!isDev) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none print:hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280' viewBox='0 0 280 280'%3E%3Ctext x='140' y='140' fill='%23dc2626' font-family='system-ui, sans-serif' font-weight='bold' font-size='18' text-anchor='middle' transform='rotate(-35 140 140)' opacity='0.15'%3EAMBIENTE DE TESTE%3C/text%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
      }}
      aria-hidden="true"
    />
  );
}
