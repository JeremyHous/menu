import { Gloock, Karla } from "next/font/google";

// Loaded once here and imported by every /menus page, as recommended for
// fonts used in more than one place.
export const display = Gloock({ weight: "400", subsets: ["latin"] });
export const body = Karla({
  subsets: ["latin"],
  variable: "--font-body",
});
