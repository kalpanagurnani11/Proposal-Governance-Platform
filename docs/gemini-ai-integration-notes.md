# Gemini AI Integration: Dev & Debug Notes

Since this platform is heavily focused on AI-driven governance, I had to build a custom integration with Gemini for analyzing proposals. I wrote the `AiAssistantController.java` and the frontend React components manually.

### Architecture Choice: Server-Side vs Client-Side LLM Calls
**My Dilemma:**
I initially wondered if I should just call the Gemini API directly from React to save backend bandwidth. 

**My Prompt to AI:**
> "Act as a harsh Cloud Security Expert. I am building a chat feature using the Gemini API. I plan to make the HTTP calls directly from React `fetch()` to keep latency low. Please critique this architecture. What security flaws am I introducing, and how should a senior engineer design this?"

**The Decision:**
The AI critique immediately flagged the fatal flaw: putting my Gemini API Key in the Vite frontend exposes it to the public. It enforced that routing it through the Spring Boot backend allows me to secure the key, persist conversation history, and enforce rate-limiting. So backend routing was the obvious choice.

### Bug 1: Unescaped JSON from the LLM
**The Issue:**
When the Gemini model responded with a detailed markdown report, my React component would crash due to raw `\n` tags and quotes.

**My Prompt to AI:**
> "Act as a strict Senior Java Developer. Critique my JSON serialization. I am returning a response from Gemini to React by manually building a string like this: `\"{ \\\"response\\\": \\\"\" + aiText + \"\\\" }\"`. Why is this causing a `SyntaxError: Expected double-quoted property name` in Chrome, and what is the correct enterprise standard for doing this in Spring Boot?"

**The Fix:**
The AI heavily criticized the manual string concatenation, explaining that control characters inside `aiText` will silently break the JSON. It suggested wrapping the response in a Java `Map` and letting Spring's Jackson `ObjectMapper` handle the string escaping automatically. Worked like a charm.

### Bug 2: 429 Too Many Requests
**The Issue:**
While testing, I spammed the chat and the backend threw a 500 error because the Gemini API returned a 429 Too Many Requests.

**The Fix (Manual):**
Instead of just letting the app crash, I manually added a `try-catch` block in `AiAnalysisService.java` to catch 429s and return a polite "AI is currently thinking too hard" message to the React UI.
