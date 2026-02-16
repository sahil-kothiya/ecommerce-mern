---
description: Inline comments and documentation standards for the codebase
applyTo: "**/*.{js,jsx,ts,tsx}"
---

# Inline Comments & Documentation Standards

## General Principles

**ALWAYS add inline comments** to improve code readability and maintainability.

### When to Add Comments

✅ **Required Comments:**

- Complex business logic or algorithms
- Non-obvious code patterns or workarounds
- Function/method parameters and return values
- State management and side effects
- API endpoints and data flow
- Validation rules and constraints
- Security-critical sections
- Performance optimizations

❌ **Avoid Comments For:**

- Self-explanatory code (e.g., `// Set x to 5` for `x = 5`)
- Redundant descriptions of what code obviously does
- Commented-out code (delete instead)
- Obsolete or outdated information

## Comment Style Guidelines

### 1. Section Headers

Use clear section separators for major code blocks:

```javascript
// ============================================================================
// SECTION TITLE (e.g., STATE & HOOKS, VALIDATION, API CALLS)
// ============================================================================
```

### 2. Single-Line Comments

Use for brief explanations above or beside code:

```javascript
// Validate email format before sending to server
const isValid = validateEmail(email);

const maxRetries = 3; // Maximum number of API retry attempts
```

### 3. Multi-Line Comments

Use for detailed explanations or complex logic:

```javascript
/**
 * Calculate discounted price with multiple coupon support
 *
 * Handles percentage and fixed-amount coupons with stacking rules:
 * - Percentage coupons applied first, in order of discount amount
 * - Fixed-amount coupons applied last
 * - Minimum order value enforced per coupon
 */
function calculateDiscount(price, coupons) {
  // Implementation...
}
```

### 4. Function/Method Documentation

Document purpose, parameters, and return values:

```javascript
/**
 * Authenticate user and generate JWT tokens
 *
 * @param {string} email - User's email address (validated)
 * @param {string} password - Plain text password (will be hashed)
 * @param {boolean} rememberMe - If true, extends token expiration to 30 days
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 * @throws {AuthError} If credentials are invalid
 */
async function login(email, password, rememberMe) {
  // Implementation...
}
```

## Project-Specific Standards

### Frontend (React) Comments

```jsx
// ============================================================================
// COMPONENT: LoginPage
// ============================================================================
// Handles user authentication with email/password
// Features: Form validation (Yup), Remember me, Password reset

const LoginPage = () => {
  // ========================================================================
  // STATE & HOOKS
  // ========================================================================
  const navigate = useNavigate();

  // Track form submission state
  const [isLoading, setIsLoading] = useState(false);

  // Store server error messages
  const [error, setError] = useState("");

  // ========================================================================
  // FORM VALIDATION
  // ========================================================================
  const {
    register, // Register input fields with validation
    handleSubmit, // Validation-aware submit handler
    formState: { errors }, // Field-level validation errors
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  const onSubmit = async (data) => {
    // Clear previous errors
    setError("");
    // ... rest of implementation
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div>
      {/* Page header with title and subtitle */}
      <header>
        <h1>Welcome Back</h1>
      </header>

      {/* Error alert - shows validation/server errors */}
      {error && <Alert>{error}</Alert>}

      {/* Login form with validation */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email input field */}
        <input {...register("email")} />
      </form>
    </div>
  );
};
```

### Backend (Node.js/Express) Comments

```javascript
// ============================================================================
// AUTHENTICATION CONTROLLER
// ============================================================================
// Handles user registration, login, logout, and token refresh

export class AuthController extends BaseController {
  // ========================================================================
  // LOGIN
  // ========================================================================
  // Authenticate user with email/password and generate JWT tokens
  login = this.catchAsync(async (req, res) => {
    // Extract and validate credentials from request body
    const { email, password, rememberMe } = req.body;

    // Find user by email (case-insensitive search)
    const user = await User.findOne({ email: email.toLowerCase() });

    // Verify user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Invalid email or password", 401);
    }

    // Generate tokens with appropriate expiration
    const accessToken = generateToken(user._id, rememberMe ? "30d" : "1d");

    // Set HTTP-only cookie for security
    res.cookie("accessToken", accessToken, {
      httpOnly: true, // Prevent XSS attacks
      secure: true, // HTTPS only
      sameSite: "strict", // CSRF protection
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    });

    // Send success response
    this.sendSuccess(res, { user, token: accessToken }, "Login successful");
  });
}
```

### Validation Comments

```javascript
// ============================================================================
// LOGIN VALIDATOR
// ============================================================================
// Validates user login credentials with express-validator

export const loginValidator = [
  // Validate email: must be valid format, normalized to lowercase
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  // Validate password: must not be empty (strength checked on registration)
  body("password").notEmpty().withMessage("Password is required"),

  // Validate rememberMe: optional boolean for persistent sessions
  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be a boolean value"),
];
```

## API Route Comments

```javascript
// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// User registration with validation and rate limiting
router.post(
  "/register",
  authRateLimiter, // Prevent brute force attacks
  registerValidator, // Validate input data
  validate, // Check validation results
  authController.register,
);

// User login with email/password
router.post(
  "/login",
  authRateLimiter, // Limit login attempts
  loginValidator, // Validate credentials format
  validate, // Check validation results
  authController.login,
);

// Logout (requires authentication)
router.post(
  "/logout",
  protect, // Verify JWT token
  authController.logout,
);
```

## Database Model Comments

```javascript
// ============================================================================
// USER MODEL
// ============================================================================
// Represents application users with authentication and profile data

const userSchema = new Schema({
  // User identification
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"],
  },

  // Authentication credentials
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true, // Normalize to lowercase for case-insensitive lookup
    trim: true,
    validate: [validator.isEmail, "Invalid email format"],
  },

  // Hashed password (never store plain text)
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false, // Exclude from query results by default
  },
});

// Pre-save hook: Hash password before storing
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) return next();

  // Generate salt and hash password (10 rounds)
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

## Best Practices

1. **Write comments while coding**, not as an afterthought
2. **Update comments** when changing code logic
3. **Be concise but clear** - avoid unnecessary verbosity
4. **Explain WHY, not WHAT** - code shows what, comments explain why
5. **Use consistent formatting** - follow section headers and spacing
6. **Comment complex regex** - always explain regex patterns
7. **Document APIs** - include request/response examples in comments
8. **Avoid redundancy** - don't repeat what code obviously does
9. **Use JSDoc for functions** - helps IDE autocomplete and type checking
10. **Keep comments up to date** - outdated comments are worse than no comments
11. **No direct console logging** - use the project `src/utils/logger.js` (for example, `logger.info`) for all server-side logging
12. **Clean Code** - Remove commented-out code immediately; do not commit it to the repository

## Examples of Good vs Bad Comments

### ❌ Bad Comments

```javascript
// Set loading to true
setIsLoading(true);

// Loop through users
users.forEach(user => { ... });

// Call API
fetch('/api/data');
```

### ✅ Good Comments

```javascript
// Show loading spinner while fetching user data from server
setIsLoading(true);

// Send welcome email to each newly registered user
users.forEach((user) => sendWelcomeEmail(user));

// Fetch user preferences with retry logic (max 3 attempts)
fetchWithRetry("/api/user/preferences", { maxRetries: 3 });
```

## Comment Maintenance

- **Code reviews**: Check for missing or outdated comments
- **Refactoring**: Update comments when changing logic
- **Documentation**: Extract important comments to separate docs when needed
- **Removal**: Delete commented-out code and obsolete comments

---

**Remember:** Good comments make your code easier to understand for:

- Future you (6 months later)
- Teammates working on the same codebase
- New developers joining the project
- Code reviewers and maintainers

**Apply to:** All JavaScript/JSX/TypeScript files in the project  
**Priority:** High - Add comments to all new code and gradually improve existing code  
**Updated:** February 11, 2026
