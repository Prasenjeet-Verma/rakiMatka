const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const uploadToPhpServer = async (filePath) => {
  const form = new FormData();

  form.append("image", fs.createReadStream(filePath), {
  filename: "qr.png",
});
  form.append("api_key", process.env.PHP_UPLOAD_API_KEY);

  try {
    const res = await axios.post(
      process.env.PHP_UPLOAD_URL,
      form,
      {
        headers: form.getHeaders(),
        timeout: 15000,
      }
    );

    console.log("PHP upload response:", res.data);

    if (!res.data || res.data.status !== true || !res.data.url) {
      throw new Error(res.data?.message || "Image upload failed");
    }

    return res.data.url;
  } catch (err) {
    console.error(
      "PHP upload error:",
      err.response?.data || err.message
    );
    throw new Error("Image upload failed");
  }
};

module.exports = uploadToPhpServer;
