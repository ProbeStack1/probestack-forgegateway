/**
 * Claude AI Service
 * Direct browser integration using Anthropic's CORS-enabled API
 */

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// Debug: Log API key status (not the actual key)
console.log("Claude Service initialized:", { 
  apiKeyConfigured: Boolean(ANTHROPIC_API_KEY), 
  apiKeyLength: ANTHROPIC_API_KEY?.length || 0 
});

// System prompt for migration assistance
const MIGRATION_SYSTEM_PROMPT = `You are an expert API migration assistant specializing in Apigee Edge to Apigee X/Hybrid and Kong Konnect migrations. 

Your role is to:
1. Analyze migration issues, warnings, and errors
2. Provide specific, actionable solutions
3. Explain the root cause of problems
4. Suggest best practices for API migration

When analyzing resource-specific issues:
- Focus on the specific error messages provided
- Consider compatibility differences between platforms
- Suggest configuration changes or code modifications
- Provide step-by-step guidance when needed

Keep responses concise but thorough. Use bullet points for clarity when listing multiple solutions.`;

/**
 * Send a message to Claude API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} - Claude's response
 */
export const sendMessageToClaude = async (messages, options = {}) => {
  const {
    model = "claude-3-haiku-20240307",
    maxTokens = 2048,
    systemPrompt = MIGRATION_SYSTEM_PROMPT,
  } = options;

  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured. Please set VITE_ANTHROPIC_API_KEY in your environment.");
  }

  const requestBody = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
  };

  console.log("Claude API Request:", { model, messagesCount: messages.length });

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error("Claude API Error Response:", responseData);
      const errorMessage = responseData.error?.message || responseData.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    console.log("Claude API Success:", { model: responseData.model, usage: responseData.usage });
    
    return {
      success: true,
      content: responseData.content[0]?.text || "",
      usage: responseData.usage,
      model: responseData.model,
    };
  } catch (error) {
    console.error("Claude API Error:", error);
    return {
      success: false,
      error: error.message || "Failed to get response from Claude",
    };
  }
};

/**
 * Build a context-aware prompt for resource-specific issues
 * @param {Object} resourceData - Resource data with issues and warnings
 * @returns {string} - Formatted prompt
 */
export const buildResourcePrompt = (resourceData) => {
  if (!resourceData) return null;

  const { name, type, issues = [], warnings = [] } = resourceData;
  
  const issuesList = issues.map(i => `• ${i.message || i}`).join("\n");
  const warningsList = warnings.map(w => `• ${w.message || w.type || w}`).join("\n");

  let prompt = `I need help with migrating the following API resource:\n\n`;
  prompt += `**Resource Name:** ${name}\n`;
  prompt += `**Resource Type:** ${type}\n\n`;

  if (issues.length > 0) {
    prompt += `**Issues Found:**\n${issuesList}\n\n`;
  }

  if (warnings.length > 0) {
    prompt += `**Warnings:**\n${warningsList}\n\n`;
  }

  prompt += `Please analyze these issues and provide specific solutions for each.`;

  return prompt;
};

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export const isClaudeConfigured = () => {
  return Boolean(ANTHROPIC_API_KEY);
};
