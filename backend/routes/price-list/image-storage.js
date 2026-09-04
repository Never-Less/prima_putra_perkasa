const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { cloudinary, validateCloudinaryConfiguration } = require("../../config/cloudinary");

const maxImages = 4;
const maxImageSize = 2 * 1024 * 1024;
const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const uploadDirectory = path.resolve(__dirname, "../../uploads/price-list");

fs.mkdirSync(uploadDirectory, { recursive: true });

function safeImageName(value) {
  const filename = String(value || "").trim();
  const basename = path.basename(filename);
  return filename && filename === basename ? basename : "";
}

function getImagePath(filename) {
  const safeName = safeImageName(filename);
  return safeName ? path.join(uploadDirectory, safeName) : "";
}

async function removeImageFile(filename) {
  const imagePath = getImagePath(filename);
  if (!imagePath) return;

  try {
    await fs.promises.unlink(imagePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSize, files: maxImages },
  fileFilter: (_req, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      return callback(new Error("Foto harus berformat JPG, PNG, atau WEBP."));
    }
    return callback(null, true);
  },
});

function uploadPriceListImages(req, res, next) {
  uploader.array("images", maxImages)(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({ message: error.message || "Foto gagal diunggah." });
  });
}

function uploadImageBuffer(file) {
  validateCloudinaryConfiguration();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_PRICE_LIST_FOLDER || "prima-putra-perkasa/price-list",
        resource_type: "image",
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => error ? reject(error) : resolve(result)
    );
    stream.end(file.buffer);
  });
}

function cloudinaryPublicId(value) {
  const reference = String(value || "").trim();
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(reference)) return "";
  try {
    const pathname = decodeURIComponent(new URL(reference).pathname);
    const marker = "/image/upload/";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return "";
    const afterUpload = pathname.slice(markerIndex + marker.length).replace(/^v\d+\//, "");
    return afterUpload.replace(/\.[a-z0-9]+$/i, "");
  } catch (_error) {
    return "";
  }
}

function isManagedCloudinaryImage(value) {
  const folder = process.env.CLOUDINARY_PRICE_LIST_FOLDER || "prima-putra-perkasa/price-list";
  return cloudinaryPublicId(value).startsWith(`${folder}/`);
}

async function removeStoredImage(reference) {
  if (isManagedCloudinaryImage(reference)) {
    validateCloudinaryConfiguration();
    await cloudinary.uploader.destroy(cloudinaryPublicId(reference), { resource_type: "image", invalidate: true });
    return;
  }
  await removeImageFile(reference);
}

module.exports = {
  getImagePath,
  maxImages,
  isManagedCloudinaryImage,
  removeImageFile,
  removeStoredImage,
  safeImageName,
  uploadImageBuffer,
  uploadPriceListImages,
};
