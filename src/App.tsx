import React, { useEffect, useState } from 'react';
import { Amplify } from "aws-amplify";
import { Auth } from "aws-amplify"; // ✅ Correct import for new versions
import awsConfig from "./aws-exports";
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

// Configure Amplify
Amplify.configure(awsConfig);

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchLogs, setFetchLogs] = useState([]);

  // Log messages to UI and console
  const logMessage = (message) => {
    setFetchLogs(prevLogs => [...prevLogs, message]);
    console.log("📜 LOG:", message);
  };

  async function getS3Client() {
    logMessage("🔍 Initializing S3 Client...");

    try {
      logMessage("🔍 Attempting to retrieve credentials from Amplify...");
      const credentials = await Auth.currentCredentials();

      if (!credentials || !credentials.accessKeyId) {
        throw new Error("❌ Failed to retrieve valid Amplify IAM credentials.");
      }

      logMessage("✅ Successfully retrieved Amplify IAM credentials:");
      logMessage(`🔑 Access Key ID: ${credentials.accessKeyId}`);
      logMessage(`🔑 Session Token: ${credentials.sessionToken ? "Exists ✅" : "Missing ❌"}`);

      return new S3Client({
        region: "us-east-1",
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken, // Required for assumed roles
        },
      });
    } catch (error) {
      logMessage(`❌ Error retrieving credentials from Amplify: ${error.message}`);

      if (process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY) {
        logMessage("⚠️ Using environment variables as a fallback for credentials.");
        logMessage(`🔑 REACT_APP_AWS_ACCESS_KEY_ID: ${process.env.REACT_APP_AWS_ACCESS_KEY_ID}`);

        return new S3Client({
          region: "us-east-1",
          credentials: {
            accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
          },
        });
      } else {
        throw new Error("❌ No valid AWS credentials found.");
      }
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      logMessage("🔍 Fetching posts from S3...");

      const s3 = await getS3Client();
      const bucketName = "social-media-automation-daily-tasks";
      const platforms = ["Facebook", "Instagram", "LinkedIn"];
      let allTasks = [];

      for (const platform of platforms) {
        logMessage(`📜 Fetching posts from S3 for platform: ${platform}...`);
        logMessage(`🔍 Listing objects in bucket: ${bucketName}, folder: ${platform}/`);

        try {
          const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: `${platform}/`,
          });

          const { Contents } = await s3.send(listCommand);

          if (!Contents || Contents.length === 0) {
            logMessage(`❌ No files found in ${platform} folder`);
            continue;
          }

          logMessage(`✅ Found ${Contents.length} file(s) in ${platform} folder:`);

          const platformPosts = await Promise.all(
            Contents.map(async (file) => {
              if (file.Key.endsWith(".json")) {
                logMessage(`📂 Fetching file: ${file.Key}`);

                const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: file.Key });

                try {
                  const { Body } = await s3.send(getCommand);

                  const streamToString = (stream) =>
                    new Promise((resolve, reject) => {
                      let data = "";
                      stream.on("data", (chunk) => (data += chunk));
                      stream.on("end", () => resolve(data));
                      stream.on("error", reject);
                    });

                  const jsonData = await streamToString(Body);
                  const parsedData = JSON.parse(jsonData);

                  return {
                    ...parsedData,
                    date: file.LastModified,
                    platform,
                  };
                } catch (fetchError) {
                  logMessage(`❌ Failed to fetch ${file.Key}: ${fetchError.message}`);
                  return null;
                }
              }
              return null;
            })
          );

          allTasks = [...allTasks, ...platformPosts.filter(Boolean)];
        } catch (error) {
          logMessage(`❌ Error fetching posts for ${platform}: ${error.message}`);
        }
      }

      setTasks(allTasks);
      logMessage(`✅ Successfully loaded ${allTasks.length} posts.`);

    } catch (err) {
      setError("Failed to fetch posts. Please try again later.");
      logMessage(`❌ Error fetching posts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📢 Social Media Post Tracker</h1>
          <button onClick={fetchTasks} className="bg-green-500 text-white px-4 py-2 rounded flex items-center shadow-lg hover:bg-green-600 transition">
            <RefreshCw className="w-5 h-5 mr-2" /> Refresh
          </button>
        </div>

        {/* Fetch Logs */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow-md max-h-40 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2">📜 Fetch Logs</h2>
          <ul className="text-sm text-gray-600">
            {fetchLogs.map((log, index) => (
              <li key={index}>• {log}</li>
            ))}
          </ul>
        </div>

        {/* Loading State */}
        {loading && <div className="text-center text-blue-500 text-lg font-semibold">Loading posts...</div>}

        {/* Error State */}
        {error && <div className="text-center text-red-500 flex items-center justify-center mt-4">
          <AlertCircle className="w-5 h-5 mr-2" /> {error}
        </div>}

        {/* Posts List */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="border-l-8 border-blue-500 rounded-lg p-4 bg-gray-50 shadow-md hover:shadow-lg transition">
              <h2 className="text-xl font-semibold text-gray-700">{task.platform.toUpperCase()}</h2>
              <span className="text-sm text-gray-500">{format(new Date(task.date), 'PPP')}</span>
              <p className="mt-2 text-gray-800 text-lg font-medium">{task.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
