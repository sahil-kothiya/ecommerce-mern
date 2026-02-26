const request = require("supertest");

describe("Auth abuse rate limiting", () => {
  let app;
  let config;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const appModule = await import("./src/app.js");
    const configModule = await import("./src/config/index.js");
    app = appModule.default;
    config = configModule.config;
  });

  test("limits repeated failed login attempts for same IP+email", async () => {
    const email = `abuse-login-${Date.now()}`;
    const maxAttempts = config.authRateLimit.loginMax;
    let limited = false;

    for (let i = 0; i < maxAttempts + 5; i += 1) {
      const response = await request(app).post("/api/auth/login").send({
        email,
        password: "x",
      });

      if (response.status === 429) {
        limited = true;
        const message = response.body?.message || response.text || "";
        expect(message).toMatch(/too many login attempts/i);
        break;
      }
    }

    expect(limited).toBe(true);
  }, 15000);

  test("limits repeated forgot-password attempts for same IP+email", async () => {
    const email = `abuse-forgot-${Date.now()}`;
    const maxAttempts = config.authRateLimit.forgotPasswordMax;
    let limited = false;

    for (let i = 0; i < maxAttempts + 5; i += 1) {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email });

      if (response.status === 429) {
        limited = true;
        const message = response.body?.message || response.text || "";
        expect(message).toMatch(
          /too many password reset requests/i,
        );
        break;
      }
    }

    expect(limited).toBe(true);
  }, 15000);
});
