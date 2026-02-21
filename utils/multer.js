const multer = require("multer");

const storage = multer.diskStorage({
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, Date.now() + '.' + ext);
  }
});


const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Only images allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    files: 4,                 // max 4 images
    fileSize: 2 * 1024 * 1024 // 🔥 max 2MB per image
  },
});




// const multer = require("multer");

// const storage = multer.diskStorage({}); // temp storage

// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only images allowed"), false);
//   }
// };

// module.exports = multer({
//   storage,
//   fileFilter,
//   limits: { files: 4 }, // max 4 images
// });