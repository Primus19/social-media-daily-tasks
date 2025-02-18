import React, { useEffect, useState } from 'react';
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });
const bucketName = "social-media-automation-daily-tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchLogs, setFetchLogs] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const logMessage = (message) => {
    setFetchLogs(prevLogs => [...prevLogs, message]);
  };

  const fetchTasks = async () => {
    try {
        setLoading(true);
        setError(null);
        logMessage("🔍 Fetching posts from S3...");

        const listCommand = new ListObjectsV2Command({ 
            Bucket: bucketName,
            Prefix: "Facebook/" // Adjust for Instagram/LinkedIn
        });

        const { Contents } = await s3.send(listCommand);
        
        logMessage(`✅ S3 Response: ${Contents ? Contents.length + " files found." : "No files found!"}`);

        if (!Contents || Contents.length === 0) {
            setTasks([]);
            return;
        }

        const posts = await Promise.all(
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
                            platform: file.Key.split("/")[0] 
                        };
                    } catch (fetchError) {
                        logMessage(`❌ Failed to fetch ${file.Key}: ${fetchError.message}`);
                        return null;
                    }
                }
                return null;
            })
        );

        const validPosts = posts.filter(Boolean);
        setTasks(validPosts);
        logMessage(`✅ Successfully loaded ${validPosts.length} posts.`);

    } catch (err) {
        setError("Failed to fetch posts. Please try again later.");
        logMessage(`❌ Error fetching posts: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

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
        <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">📜 Fetch Logs</h2>
          <ul className="text-sm text-gray-600 max-h-40 overflow-y-auto">
            {fetchLogs.map((log, index) => (
              <li key={index}>• {log}</li>
            ))}
          </ul>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-blue-500 text-lg font-semibold">Loading posts...</div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center text-red-500 flex items-center justify-center mt-4">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="border-l-8 border-blue-500 rounded-lg p-4 bg-gray-50 shadow-md hover:shadow-lg transition">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700">{task.platform.toUpperCase()}</h2>
                <span className="text-sm text-gray-500">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  {format(new Date(task.date), 'PPP')}
                </span>
              </div>
              <p className="mt-2 text-gray-800 text-lg font-medium">{task.message}</p>
            </div>
          ))}
        </div>

        {/* No Posts Message */}
        {!loading && tasks.length === 0 && (
          <div className="text-center text-gray-500 mt-4">No posts found for the selected filters.</div>
        )}
      </div>
    </div>
  );
}

export default App;
