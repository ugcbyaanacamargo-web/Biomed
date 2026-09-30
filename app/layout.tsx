import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:"BIOMED | Tutor IA",
  description:"Ambiente de estudo conversacional de fisiologia sensorial."
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}</body></html>;
}
