import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
});

async function fetchPosts(platform) {
  try {
    const bucketName = "social-media-automation-daily-tasks";

    // Use platform as prefix (folder name)
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${platform}/`, // Ensure the folder is specified
    });

    const response = await s3.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.error(`❌ No files found in ${platform} folder`);
      return;
    }

    for (const file of response.Contents) {
      console.log(`📜 Fetching file: ${file.Key}`);

      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: file.Key, // Full path
      });

      const object = await s3.send(getCommand);
      const body = await object.Body?.transformToString(); // Read JSON file content
      console.log(`✅ File content for ${file.Key}:`, JSON.parse(body || "{}"));
    }
  } catch (error) {
    console.error(`❌ Error fetching posts for ${platform}:`, error);
  }
}

// Fetch posts for Facebook, Instagram, and LinkedIn
fetchPosts("Facebook");
fetchPosts("Instagram");
fetchPosts("LinkedIn");
