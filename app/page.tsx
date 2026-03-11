import OcrScanner from "@/src/components/features/OcrScanner";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-gray-50 flex flex-col">
      <main className="flex-1">
        <OcrScanner></OcrScanner>
      </main>
    </div>
  );
}
