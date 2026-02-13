---
description: Prevent automatic creation of summary/documentation files
applyTo: "**"
---

# No Summary Files - Token Optimization Policy

## 🚫 NEVER Auto-Create Documentation

**After completing tasks, DO NOT create:**

- ❌ Summary/changelog/guide files (`.md`, `.txt`)
- ❌ Test documentation or implementation guides
- ❌ Any post-completion documentation

## ✅ Instead

1. Fix code directly
2. Brief confirmation (1-3 sentences max)
3. Save tokens - be concise

## 📝 Exception

Create docs **ONLY** when user explicitly says:

- "Create documentation for..."
- "Generate a summary..."
- "Document this in a file..."

## 💬 Response Examples

❌ **BAD:** "I've completed the changes. Let me create a summary file... [Creates IMPLEMENTATION_SUMMARY.md]"

✅ **GOOD:** "Fixed. Logo is now optional. Added validation to all Brand APIs. 5 files updated."

## 🎯 Token Optimization

1. Be direct - no meta-commentary about which tools you're using
2. No preambles - get straight to the solution
3. Avoid repetition - don't restate what was already said
4. Minimal context - only include necessary background
5. Code-first - show changes, don't describe them verbosely

## 📂 File Creation Rules

**Create:**

- ✅ Source code (components, services, controllers)
- ✅ Configuration files
- ✅ User-requested documentation

**Never auto-create:**

- ❌ Implementation summaries
- ❌ Test guides
- ❌ Tutorial files
- ❌ Change logs (unless explicitly requested)

---

**Priority:** CRITICAL | **Applies To:** All interactions | **Date:** Feb 12, 2026

- Added validation to all Brand APIs
- Fixed error handling in brandService.js

All 5 files updated successfully.

```

## 🎯 Token Optimization Rules

1. **Be direct** - Answer the question, don't over-explain
2. **Avoid repetition** - Don't restate what was already said
3. **Skip meta-commentary** - Don't announce which tools you're using
4. **Minimal context** - Only include necessary background
5. **No preambles** - Get straight to the solution

### Example Comparison:

**❌ Token-wasting response (150 tokens):**

```

I'll help you with that! Let me first analyze the current implementation
to understand the codebase structure. I'll use the read_file tool to
examine the relevant files, then I'll implement the changes using the
multi_replace_string_in_file tool for efficiency. After making the
changes, I'll create a comprehensive summary document...

```

**✅ Token-efficient response (20 tokens):**

```

[Makes changes directly with tools]

Fixed. Logo is now optional and validation added to all Brand APIs.

```

## 📂 File Creation Policy

### Create Files Only For:

- **Source code** - Components, services, controllers, etc.
- **Configuration** - Package.json, .env.example, etc.
- **User-requested docs** - When explicitly asked

### Never Auto-Create:

- Implementation summaries
- Test guides
- Change logs
- Tutorial files
- Explanation documents
- Post-task summaries

## 🔍 Exception: RestDoc Folder

The `RestDoc/` folder contains project documentation BUT:

- **DO NOT** add files there after each task
- Only update RestDoc when user requests documentation
- Keep existing docs updated if they become outdated
- Don't create dated subfolders automatically

## 📊 Before/After Example

### ❌ BEFORE (Bad practice):

```

User: "Make logo optional in Brand form"

AI Response:

- Modifies 5 files ✅
- Creates BRAND_LOGO_OPTIONAL_SUMMARY.md ❌
- Creates VALIDATION_GUIDE.md ❌
- Creates TESTING_INSTRUCTIONS.md ❌
- Token usage: 15,000 ❌

```

### ✅ AFTER (Good practice):

```

User: "Make logo optional in Brand form"

AI Response:

- Modifies 5 files ✅
- Brief confirmation message ✅
- No extra files created ✅
- Token usage: 3,000 ✅

```

## 🎓 Summary

**Golden Rule:** Code changes = YES | Summary files = NO (unless requested)

**Remember:**

- Fix the problem directly
- Respond briefly
- Save tokens
- Don't create documentation files automatically

---

**Priority Level:** CRITICAL
**Applies To:** All chat interactions
**Effective Date:** February 12, 2026
```
