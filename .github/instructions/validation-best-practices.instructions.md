---
description: Comprehensive validation guidelines for client and server
applyTo: "**/*.{js,jsx}"
---

# Validation Best Practices - Client & Server

## Core Principles

**ALWAYS validate on BOTH client and server sides:**

- **Client-side**: Improve UX with immediate feedback
- **Server-side**: Ensure security (never trust client data)

## Client-Side Validation (React)

### Use React Hook Form + Yup

**Modern, performant validation library for React applications**

#### Installation

```bash
npm install react-hook-form yup @hookform/resolvers
```

#### Implementation Pattern

```jsx
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

// Define validation schema
const schema = yup.object().shape({
  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email format")
    .trim(),

  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Must contain uppercase, lowercase, and number",
    ),
});

// Use in component
const MyForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onBlur", // Validate on blur for better UX
  });

  const onSubmit = (data) => {
    // Data is validated here
    logger.info(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
};
```

### Validation Modes

- `mode: 'onSubmit'` - Validate only on submit (default)
- `mode: 'onBlur'` - Validate when field loses focus (recommended)
- `mode: 'onChange'` - Validate on every keystroke (can be annoying)
- `mode: 'onTouched'` - Validate after first blur, then on change

### Common Yup Validations

```javascript
// String validations
yup
  .string()
  .required("Field is required")
  .min(3, "Minimum 3 characters")
  .max(100, "Maximum 100 characters")
  .email("Invalid email format")
  .url("Must be a valid URL")
  .matches(/regex/, "Custom regex message")
  .trim()
  .lowercase()
  .uppercase();

// Number validations
yup
  .number()
  .required("Number is required")
  .min(0, "Must be positive")
  .max(100, "Cannot exceed 100")
  .integer("Must be whole number")
  .positive("Must be positive")
  .negative("Must be negative");

// Boolean validations
yup
  .boolean()
  .required("Must be true or false")
  .oneOf([true], "Must accept terms");

// Array validations
yup
  .array()
  .required("Array required")
  .min(1, "At least one item required")
  .max(5, "Maximum 5 items")
  .of(yup.string());

// Object validations
yup.object().shape({
  nested: yup.string().required(),
});

// Conditional validations
yup.string().when("otherField", {
  is: true,
  then: (schema) => schema.required("Required when other is true"),
});

// Custom validations
yup.string().test("custom-test", "Custom error message", (value) => {
  return value !== "forbidden";
});
```

## Server-Side Validation (Express)

### Use Express Validator

**Robust validation middleware for Express.js**

#### Installation

Already included in the project.

#### Implementation Pattern

```javascript
import { body, param, query } from "express-validator";
import { validate } from "../validators/index.js";

// Define validators
export const loginValidator = [
  // Validate and sanitize email
  body("email")
    .trim() // Remove whitespace
    .isEmail() // Check email format
    .normalizeEmail() // Convert to lowercase
    .withMessage("Invalid email"),

  // Validate password
  body("password")
    .notEmpty()
    .withMessage("Password required")
    .isLength({ min: 8 })
    .withMessage("Min 8 characters"),

  // Validate optional fields
  body("rememberMe").optional().isBoolean().withMessage("Must be boolean"),
];

// Apply to route
router.post(
  "/login",
  loginValidator, // Run validation rules
  validate, // Check results and throw errors
  controller.login, // Execute if validation passes
);
```

### Common Express Validator Rules

```javascript
// String validations
body("field")
  .trim() // Remove whitespace
  .notEmpty() // Must not be empty
  .isLength({ min: 2, max: 100 }) // Length constraints
  .isEmail() // Email format
  .isURL() // URL format
  .isAlphanumeric() // Only letters and numbers
  .matches(/regex/) // Custom regex
  .escape() // HTML escape
  .toLowerCase() // Convert to lowercase
  .toUpperCase(); // Convert to uppercase

// Number validations
body("age")
  .isInt({ min: 0, max: 120 }) // Integer with range
  .toInt() // Convert to integer
  .isFloat({ min: 0.0 }) // Decimal number
  .toFloat(); // Convert to float

// Boolean validations
body("active")
  .isBoolean() // Must be true/false
  .toBoolean(); // Convert to boolean

// Date validations
body("birthdate")
  .isISO8601() // ISO date format
  .toDate() // Convert to Date object
  .custom((value) => {
    const age = calculateAge(value);
    return age >= 18;
  })
  .withMessage("Must be 18 or older");

// Array validations
body("tags")
  .isArray({ min: 1, max: 5 }) // Array size constraints
  .custom((array) => {
    return array.every((item) => typeof item === "string");
  });

// Custom validations
body("confirmPassword")
  .custom((value, { req }) => {
    return value === req.body.password;
  })
  .withMessage("Passwords must match");

// Conditional validations
body("phone")
  .if(body("country").equals("US"))
  .matches(/^\d{10}$/)
  .withMessage("Invalid US phone number");

// Sanitization
body("name")
  .trim() // Remove whitespace
  .escape() // Prevent XSS
  .normalizeEmail(); // For email fields
```

### Parameter Validation

```javascript
// URL parameters
param("id").isMongoId().withMessage("Invalid ID format");

// Query parameters
query("page").optional().isInt({ min: 1 }).toInt();

query("search").optional().trim().escape();
```

## Validation Middleware

```javascript
// Generic validation middleware
import { validationResult } from "express-validator";
import { AppError } from "../middleware/errorHandler.js";

export const validate = (req, res, next) => {
  // Extract validation errors
  const errors = validationResult(req);

  // If no errors, continue
  if (errors.isEmpty()) {
    return next();
  }

  // Format error messages
  const errorMessages = errors.array().map((error) => ({
    field: error.path || error.param,
    message: error.msg,
  }));

  // Throw formatted error
  throw new AppError("Validation failed", 400, errorMessages);
};
```

## Security Best Practices

### Input Sanitization

**Always sanitize user input to prevent attacks**

```javascript
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Manual sanitization in validators
body("email")
  .trim() // Remove spaces
  .escape() // Escape HTML characters
  .normalizeEmail(); // Standardize format
```

### XSS Prevention

```javascript
// Escape HTML in user input
body("comment").trim().escape(); // Converts <script> to &lt;script&gt;

// Or use allowlist for rich text
body("description").customSanitizer((value) => {
  return sanitizeHtml(value, {
    allowedTags: ["b", "i", "em", "strong"],
    allowedAttributes: {},
  });
});
```

### SQL/NoSQL Injection Prevention

```javascript
// Validate ObjectId before querying MongoDB
param("id")
  .custom((value) => {
    return mongoose.Types.ObjectId.isValid(value);
  })
  .withMessage("Invalid ID format");

// Use parameterized queries (automatically by Mongoose)
// ❌ NEVER: await User.find({ email: req.body.email })
// ✅ ALWAYS: await User.findOne({ email: sanitizedEmail })
```

## Error Display

### Client-Side Error Display

```jsx
// Field-level errors
{
  errors.email && (
    <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
  );
}

// Form-level errors
{
  Object.keys(errors).length > 0 && (
    <div className="bg-red-50 border border-red-200 p-4 rounded">
      <p className="font-semibold">Please fix the following errors:</p>
      <ul className="list-disc pl-5">
        {Object.values(errors).map((error, idx) => (
          <li key={idx}>{error.message}</li>
        ))}
      </ul>
    </div>
  );
}

// Server errors
{
  serverError && (
    <div className="bg-red-50 border border-red-200 p-4 rounded">
      <p className="text-red-600">{serverError}</p>
    </div>
  );
}
```

### Server-Side Error Response

```javascript
// Validation error response format
{
    "success": false,
    "message": "Validation failed",
    "errors": [
        {
            "field": "email",
            "message": "Invalid email format"
        },
        {
            "field": "password",
            "message": "Password must be at least 8 characters"
        }
    ]
}
```

## Testing Validation

### Test All Edge Cases

```javascript
// Client-side tests
- Empty fields
- Invalid formats (email, URL, etc.)
- Boundary values (min/max length)
- Special characters
- XSS attempts (<script>alert('xss')</script>)
- SQL injection attempts (' OR '1'='1)
- Very long inputs (buffer overflow)

// Server-side tests (use Postman/API client)
- Missing required fields
- Invalid data types
- Out-of-range values
- Malformed ObjectIds
- Duplicate unique fields
- Concurrent requests
```

## Validation Checklist

Before deploying any form:

- ✅ Client-side validation implemented (React Hook Form + Yup)
- ✅ Server-side validation implemented (Express Validator)
- ✅ All inputs sanitized (trim, escape, normalize)
- ✅ Error messages are user-friendly
- ✅ Field-level errors displayed clearly
- ✅ Form-level errors shown at top
- ✅ Loading states prevent double-submission
- ✅ Success feedback shown after submission
- ✅ XSS prevention in place
- ✅ NoSQL injection prevention implemented
- ✅ Rate limiting applied to sensitive endpoints
- ✅ Tested with invalid data via Postman
- ✅ Tested edge cases and boundary values
- ✅ Inline comments explain validation rules

---

**Apply to:** All forms and API endpoints in the project  
**Priority:** Critical - Security and data integrity requirement  
**Updated:** February 11, 2026
