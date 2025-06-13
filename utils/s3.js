const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadToS3 = async (file, userId) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `profile-pics/${userId}-${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  try {
    const result = await s3.upload(params).promise();
    return { Location: result.Location };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

module.exports = { uploadToS3 };