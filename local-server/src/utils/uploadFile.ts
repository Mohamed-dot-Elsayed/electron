// utils/uploadFile.ts
import multer from "multer";
import path from "path";
import fs from "fs";

// للصور والملفات العادية
export function uploadFile(folderName = "uploads") {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
      }
      cb(null, folderName);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + path.extname(file.originalname);
      cb(null, uniqueName);
    },
  });

  return multer({ storage });
}

// للـ Excel (Memory)
export function uploadExcelFile() {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only Excel files allowed"));
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}
