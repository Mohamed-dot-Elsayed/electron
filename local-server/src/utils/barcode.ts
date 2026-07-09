import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";

export const generateBarcodeImage = async (
  barcodeNumber: string,
  filename: string
) => {
  const buffer = await bwipjs.toBuffer({
    bcid: "code128",       // نوع الباركود
    text: barcodeNumber,   // الرقم اللي دخله الأدمن
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
  });

  const uploadPath = path.join("uploads", "barcodes");
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const filePath = path.join(uploadPath, `${filename}.png`);
  fs.writeFileSync(filePath, buffer);

  return `/${filePath}`; // يرجع لينك الصورة
};


export function generateEAN13Barcode() {
  const base = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10)
  ).join("");

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return base + checkDigit;
}
