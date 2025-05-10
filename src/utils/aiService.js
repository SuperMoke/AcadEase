import axios from "axios";

import { Buffer } from "buffer";

const OPENROUTER_API_KEY =
  "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-4-maverick:free";

const ASSEMBLYAI_API_KEY = "f2035da5685f446fabbadc40895da0da";
const ASSEMBLYAI_API_BASE = "https://api.assemblyai.com/v2";

// --- Helper: Polling Delay ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Helper: Transcribe Audio with AssemblyAI ---
const transcribeAudioWithAssemblyAI = async (base64Audio) => {
  let uploadUrl;
  let transcriptId;

  try {
    console.log("Uploading audio to AssemblyAI...");

    const audioBuffer = Buffer.from(base64Audio, "base64");

    const uploadResponse = await axios.post(
      `${ASSEMBLYAI_API_BASE}/upload`,
      audioBuffer,
      {
        headers: {
          Authorization: ASSEMBLYAI_API_KEY,

          "Content-Type": "application/octet-stream",
        },
        timeout: 60000,
      }
    );

    uploadUrl = uploadResponse.data.upload_url;
    console.log("Audio uploaded successfully:", uploadUrl);
  } catch (error) {
    console.error(
      "Error uploading audio to AssemblyAI:",
      error.response?.data || error.message
    );
    throw new Error("Failed to upload audio for transcription.");
  }

  // 2. Request Transcription
  try {
    console.log("Requesting transcription from AssemblyAI...");
    const transcriptResponse = await axios.post(
      `${ASSEMBLYAI_API_BASE}/transcript`,
      {
        audio_url: uploadUrl,
        // Add other parameters if needed (e.g., language_code)
      },
      {
        headers: {
          Authorization: ASSEMBLYAI_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    transcriptId = transcriptResponse.data.id;
    console.log("Transcription request submitted. ID:", transcriptId);
  } catch (error) {
    console.error(
      "Error requesting transcription from AssemblyAI:",
      error.response?.data || error.message
    );
    throw new Error("Failed to initiate audio transcription.");
  }

  // 3. Poll for Transcription Result
  try {
    console.log("Polling for transcription result...");
    let status = "queued"; // Initial status
    let transcriptData;

    while (status === "queued" || status === "processing") {
      await delay(3000); // Wait 3 seconds between polls (adjust as needed)
      const pollResponse = await axios.get(
        `${ASSEMBLYAI_API_BASE}/transcript/${transcriptId}`,
        {
          headers: {
            Authorization: ASSEMBLYAI_API_KEY,
          },
        }
      );
      transcriptData = pollResponse.data;
      status = transcriptData.status;
      console.log(`Transcription status: ${status}`);
    }

    if (status === "completed") {
      console.log("Transcription completed successfully.");
      return transcriptData.text; // Return the transcribed text
    } else if (status === "error") {
      console.error("AssemblyAI transcription failed:", transcriptData.error);
      throw new Error(
        `Transcription failed: ${transcriptData.error || "Unknown reason"}`
      );
    } else {
      console.warn("Transcription finished with unexpected status:", status);
      throw new Error(`Transcription ended with status: ${status}`);
    }
  } catch (error) {
    console.error(
      "Error polling/retrieving transcription:",
      error.response?.data || error.message
    );
    // Distinguish between API errors and polling logic errors if needed
    throw new Error("Failed to retrieve transcription result.");
  }
};

// --- Main AI Analysis Function ---
export const analyzeAudioWithAI = async (base64Audio) => {
  let transcription = "";

  // Step 1: Transcribe Audio using AssemblyAI
  try {
    transcription = await transcribeAudioWithAssemblyAI(base64Audio);
    if (!transcription || transcription.trim().length === 0) {
      console.warn("Transcription result is empty.");
      // Decide how to handle empty transcription: error out or proceed?
      // Let's proceed but provide default values later.
      transcription = "[Audio transcribed as empty]";
    }
    console.log("Transcription received:", transcription);
  } catch (sttError) {
    console.error("Speech-to-Text Error:", sttError);
    // Return a formatted error specific to transcription failure
    return {
      transcription: "Error transcribing audio",
      title: "Transcription Error",
      description: sttError.message || "Could not transcribe the audio.",
      priorityLevel: "Low", // Or 'High' depending on desired error visibility
      deadline: null,
      error: true,
      errorSource: "STT",
    };
  }

  // Step 2: Analyze Transcribed Text using OpenRouter LLM
  try {
    // Construct the prompt with the transcribed text
    const systemPrompt = `Role: You are "Task AI," a sophisticated AI text analyzer. Your expertise lies in identifying key information to categorize tasks and priorities from transcribed text. You are efficient, accurate, and helpful.

Context: You will receive transcribed text from an audio recording. This text may contain task descriptions, reminders, notes, or other spoken information. Your job is to:
1. Review the provided transcription.
2. Extract the core message or task.
3. Determine a suitable title that summarizes the content (5-8 words maximum).
4. Extract or summarize the key details as a description.
5. Assign a priority level (High or Low) based on context clues, urgency words, and content.
6. Extract any deadline or due date information.

Core Task: Your primary goal is to analyze the provided text and return structured information that helps the user organize and prioritize their tasks effectively.

Process & Instructions:
1. Read the transcription carefully.
2. Identify the main subject or task being discussed.
3. Create a concise, descriptive title.
4. Extract or summarize the key details as a description.
5. Determine priority level based on:
   - Explicit urgency terms ("urgent", "immediately", "ASAP", "critical", etc.)
   - Time constraints mentioned (deadlines, dates)
   - Repetition of key points
   - Context suggesting importance
6. Extract deadline information:
   - Look for specific dates ("January 15th", "next Monday", "tomorrow", etc.)
   - Look for timeframes ("in two weeks", "by end of month", etc.)
   - Format the deadline as an ISO date string (YYYY-MM-DD) when possible
   - Return null if no deadline is mentioned
7. Format the response as specified below.

For deadline detection:
- Convert relative dates (tomorrow, next week) to actual dates based on current date
- If only day of week is mentioned (e.g., "Monday"), assume the next occurrence
- For vague timeframes like "end of month", use the last day of the current month
- If no deadline is mentioned, return null

Please structure your response as valid JSON with the following format:
{
  "title": "Concise descriptive title",
  "description": "Detailed description of the task or information",
  "priorityLevel": "High or Low",
  "deadline": "YYYY-MM-DD or null if no deadline"
}`;

    console.log("Sending transcribed text to OpenRouter for analysis...");

    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze the following transcription. Respond with ONLY a valid JSON object. Do not include any explanation text, markdown formatting, or code blocks. The JSON must contain exactly these fields: title (string), description (string), priorityLevel (string - either 'High' or 'Low'), deadline (string in YYYY-MM-DD format or null).\n\nTranscription:\n---\n${transcription}\n---`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost",
          "X-Title": "Task AI Text Assistant",
        },
        timeout: 30000,
      }
    );

    // Robust parsing of the response
    let jsonResponse;
    let responseContent = response.data.choices[0].message.content;

    console.log("Raw AI analysis response:", responseContent);

    try {
      // Cleanup potential non-JSON content (e.g., Markdown code blocks)
      const jsonMatch = responseContent.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        responseContent = jsonMatch[0];
      }
      responseContent = responseContent.replace(/```json|```/g, "").trim();

      jsonResponse = JSON.parse(responseContent);
      console.log("=== AI ANALYSIS RESULTS ===");
      console.log("Title:", jsonResponse.title);
      console.log("Description:", jsonResponse.description);
      console.log("Priority:", jsonResponse.priorityLevel);
      console.log("Deadline (raw):", jsonResponse.deadline);
      console.log("Deadline type:", typeof jsonResponse.deadline);
      console.log("==========================");
    } catch (parseError) {
      console.error("Error parsing AI analysis response:", parseError);
      console.error("Full response content:", responseContent);
      // Fallback: Return transcription with analysis error info
      return {
        transcription: transcription, // Return the successful transcription
        title: "Analysis Error",
        description:
          "The system transcribed the audio but failed to analyze the content.",
        priorityLevel: "Low",
        deadline: null,
        error: true,
        errorSource: "LLM_Parse",
      };
    }

    // Validate response and provide defaults for missing fields
    return {
      transcription: transcription, // Include the transcription in the final result
      title: jsonResponse.title || "Untitled Task",
      description: jsonResponse.description || "No description generated.",
      priorityLevel: jsonResponse.priorityLevel === "High" ? "High" : "Low",
      deadline: jsonResponse.deadline || null, // Include the deadline
      error: false, // Indicate success
    };
  } catch (error) {
    console.error(
      "AI analysis error (LLM):",
      error.response?.data || error.message
    );
    // Return transcription with analysis error info
    return {
      transcription: transcription, // Return the successful transcription
      title: "Analysis Error",
      description:
        error.message ||
        "An unknown error occurred while analyzing the transcription.",
      priorityLevel: "Low",
      deadline: null,
      error: true,
      errorSource: "LLM_Request",
    };
  }
};

export const detectTaskDetailsFromImage = async (base64Image) => {
  try {
    const systemPrompt = `Role: You are "TaskScan AI", a specialized AI for detecting task-related information in images. Focus on identifying:
1. Title/Heading - Clear title of the task (max 10 words)
2. Description - Concise task description (1-2 sentences)
3. Priority Level - Only "High" or "Low" (Default to Low if unclear)
4. Deadline - Due date for the task in YYYY-MM-DD format

Instructions:
- Analyze both printed and handwritten text
- Ignore irrelevant text/unrelated content
- Prioritize text that appears most prominent
- For priority, look for keywords: urgent, important, ASAP (→ High) or optional, whenever, low (→ Low)
- For deadlines:
  - Detect date formats (MM/DD/YYYY, DD-MM-YYYY, "next Tuesday", etc.)
  - Convert to YYYY-MM-DD format
  - If a date is mentioned but ambiguous, use your best judgment
  - If no deadline is found, use null
- Return ONLY JSON format with title, description, priority, and deadline
- If any field isn't found, use empty string ("") or null for deadline

Response Format:
{
  "title": "Extracted title",
  "description": "Task description",
  "priority": "High/Low",
  "deadline": "YYYY-MM-DD or null"
}`;

    console.log("Sending image for task detail analysis...");

    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: "meta-llama/llama-4-maverick:free",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for task details. Respond ONLY with valid JSON matching the specified format. No Markdown or extra text.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost",
          "X-Title": "TaskScan AI",
        },
      }
    );

    let responseContent = response.data.choices[0].message.content;
    console.log("Raw AI response:", responseContent.substring(0, 200) + "...");

    try {
      // Clean up the response to handle potential markdown formatting
      const jsonMatch = responseContent.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        responseContent = jsonMatch[0];
      }
      responseContent = responseContent.replace(/```json|```/g, "").trim();

      const result = JSON.parse(responseContent);

      console.log("=== IMAGE RECOGNITION RESULTS ===");
      console.log("Title:", result.title);
      console.log("Description:", result.description);
      console.log("Priority:", result.priority);
      console.log("Deadline (raw):", result.deadline);
      console.log("Deadline type:", typeof result.deadline);
      console.log("================================");

      // Validate response structure
      if (!result.title || !result.description || !result.priority) {
        throw new Error("Invalid response format from AI");
      }

      // Normalize priority
      result.priority =
        result.priority.trim().toLowerCase() === "high" ? "High" : "Low";

      return {
        title: result.title.trim(),
        description: result.description.trim(),
        priority: result.priority,
        deadline: result.deadline || null, // Include deadline in the response
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Content being parsed:", responseContent);
      throw new Error(`JSON Parse error: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Task detection error:", error);

    if (error.response) {
      console.error("API Error:", error.response.data);
      throw new Error(
        `API Error: ${error.response.status} - ${
          error.response.data.error?.message || "Unknown error"
        }`
      );
    }

    throw new Error(error.message || "Failed to analyze image");
  }
};

/**
 * Processes user query with task context and returns AI response
 * @param {string} userMessage - The user's question or message
 * @param {Array} taskContext - Array of user tasks for context
 * @returns {Promise<Object>} - AI response object
 */
export const processMessageWithTaskContext = async (
  userMessage,
  taskContext
) => {
  try {
    // Check if we have tasks to provide context
    const hasTasks = Array.isArray(taskContext) && taskContext.length > 0;

    // Create a formatted context from tasks
    let formattedTasks = "";
    if (hasTasks) {
      formattedTasks = taskContext
        .map(
          (task) =>
            `Task: "${task.title}"\nDescription: "${
              task.description || "No description"
            }"\nPriority: ${task.priority || "Low"}\nCompleted: ${
              task.completed ? "Yes" : "No"
            }\nDeadline: ${task.deadline ? task.deadline : "None"}\nID: ${
              task.id
            }`
        )
        .join("\n\n");
    }

    const systemPrompt = `You are an AI assistant for a task management application. ${
      hasTasks
        ? `The user has the following tasks in their system:

${formattedTasks}`
        : "The user currently has no tasks in their system."
    }

When responding to the user:
1. If they ask about specific tasks, reference the actual tasks from their list by title
2. If they ask for tasks with certain priorities, filter and mention relevant ones
3. If they ask about task details, provide accurate information from the context
4. If they ask about deadlines or due dates, provide that information accurately from their tasks
5. Be helpful, concise, and friendly
6. If they ask something unrelated to their tasks, you can answer general questions too
${
  !hasTasks
    ? "7. If they ask about tasks, kindly inform them they don't have any tasks yet and suggest they create some"
    : ""
}

Your goal is to help the user manage their tasks and provide information about their specific task list.`;

    console.log("Sending message to OpenRouter with task context...");

    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost",
          "X-Title": "Task AI Assistant",
        },
        timeout: 30000,
      }
    );

    return {
      success: true,
      text: response.data.choices[0].message.content,
    };
  } catch (error) {
    console.error("Error processing message with task context:", error);
    return {
      success: false,
      text: "I'm sorry, I encountered an error while processing your question. Please try again.",
      error: error.message || "Unknown error",
    };
  }
};
