import { Geist } from "next/font/google";

const exportGeist = Geist({
  subsets: ["latin"],
});

export const exportFontFamily = exportGeist.style.fontFamily;
