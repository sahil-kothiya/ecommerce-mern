---
description: Form input validation and sanitization best practices
applyTo: "**/*.{jsx,js}"
---

# Form Input Validation & Sanitization Best Practices

## 🔄 Latest Code Policy

- Do not use legacy code or legacy implementation patterns.
- Always use latest stable, supported code patterns and dependencies that are compatible with this repository.

## Input Trimming (CRITICAL)

**Always trim whitespace from text inputs** to prevent accidental spaces:

```jsx
// ✅ CORRECT - Trim on change
<input
  value={formData.email}
  onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
/>

// ❌ WRONG - No trimming
<input
  value={formData.email}
  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
/>
```

Apply `.trim()` to: email, password, name, username, search queries, and all text inputs.

## Checkbox Boolean Handling

**Checkboxes require `checked` attribute and `e.target.checked`**:

```jsx
// ✅ CORRECT - Proper boolean handling
<input
  type="checkbox"
  checked={formData.rememberMe}
  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
/>

// ❌ WRONG - Using value instead of checked
<input
  type="checkbox"
  value={formData.rememberMe}
  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.value })}
/>
```

## Backend Boolean Parsing

**Handle multiple boolean formats** from different sources (JSON, form-data, query params):

```javascript
// ✅ CORRECT - Handles true, "true", 1, false, "false", 0, undefined
const rememberMe = Boolean(
  rememberMeRaw === true || rememberMeRaw === "true" || rememberMeRaw === 1,
);

// ❌ WRONG - Only handles exact boolean true
const rememberMe = rememberMeRaw === true;
```

## Request Debugging Pattern

**Always log incoming requests with data types** for debugging:

```javascript
// Backend Controller
logger.info("Request received:", {
  email,
  rememberMe: req.body.rememberMe,
  rememberMeType: typeof req.body.rememberMe,
  fullBody: req.body,
});

// Frontend Service
logger.info("API call:", {
  email,
  rememberMe,
  rememberMeType: typeof rememberMe,
  payload: { email, password, rememberMe },
});
```

## Testing Checklist

Before marking a feature as complete:

1. ✅ Test from **frontend UI** - ensure form submission works
2. ✅ Test from **API client (Postman/Thunder)** - verify backend handles raw requests
3. ✅ Check **browser console logs** - confirm data is being sent correctly
4. ✅ Check **server logs** - verify backend receives correct data types
5. ✅ Test **edge cases**: empty strings, null, undefined, wrong types
6. ✅ Verify **cross-origin cookies** are set (check DevTools > Application > Cookies)

## Form Submission Best Practice

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();

  // Log for debugging
  logger.info("Form submission:", {
    formData,
    types: Object.entries(formData).reduce(
      (acc, [key, val]) => ({
        ...acc,
        [key]: typeof val,
      }),
      {},
    ),
  });

  try {
    await apiService.submit(formData);
  } catch (error) {
    console.error("Submission failed:", error);
  }
};
```

## Common Mistakes to Avoid

1. ❌ **Not trimming inputs** - leads to "user not found" with valid emails
2. ❌ **Wrong checkbox binding** - using `value` instead of `checked`
3. ❌ **Not logging request data** - makes debugging impossible
4. ❌ **Only testing from frontend** - backend might handle data differently
5. ❌ **Assuming boolean types** - always handle string "true"/"false"
6. ❌ **Forgetting `credentials: 'include'`** - cookies won't be sent/received

## Remember

> **Test both frontend AND backend separately!**
>
> - Use browser DevTools for frontend debugging
> - Use Postman/Thunder Client for backend API testing
> - Add logger.info liberally during development
> - Remove or reduce logging in production
