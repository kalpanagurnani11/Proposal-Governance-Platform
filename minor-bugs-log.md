# Debugging Log: Minor Configuration & Syntax Issues

When building the platform, I ran into a few minor "gotchas" that I used AI to help me spot quickly instead of digging through StackOverflow.

### 1. React Infinite Re-Render Loop (July 2)
**The Issue:**
My browser tab locked up and crashed when I navigated to the Admin Dashboard. I had to force-quit Chrome.

**My Prompt:**
> "My React component `AdminDashboard.jsx` is infinitely re-rendering. Here is my `useEffect` hook: [pasted code]. I'm updating state inside it, but I forgot what I'm supposed to put in the dependency array to make it only run once."

**The Fix:**
I had totally forgotten to pass the empty dependency array `[]` as the second argument to `useEffect`. Because I omitted it entirely, the effect ran on every single render, which triggered a state update, which triggered a render... boom, infinite loop. Added the `[]` and the dashboard loaded instantly.
