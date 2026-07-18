import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"FleetMind AI", description:"One Scan. Complete Fleet Intelligence." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
