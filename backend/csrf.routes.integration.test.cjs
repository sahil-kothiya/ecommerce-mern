const request = require("supertest");

const getCookieValue = (setCookieHeader, cookieName) => {
  if (!Array.isArray(setCookieHeader)) {
    return null;
  }
  const cookieLine = setCookieHeader.find((entry) =>
    entry.startsWith(`${cookieName}=`),
  );
  if (!cookieLine) {
    return null;
  }
  return cookieLine.split(";")[0].slice(cookieName.length + 1);
};

describe("CSRF route and enforcement", () => {
  let app;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const appModule = await import("./src/app.js");
    app = appModule.default;
  });

  test("GET /api/auth/csrf-token returns token and sets csrf cookie", async () => {
    const response = await request(app).get("/api/auth/csrf-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data?.csrfToken).toBe("string");
    expect(response.body.data.csrfToken.length).toBeGreaterThan(20);

    const csrfCookie = getCookieValue(response.headers["set-cookie"], "csrfToken");
    expect(csrfCookie).toBeTruthy();
  });

  test("blocks /api/auth/refresh-token without csrf header when session cookie exists", async () => {
    const tokenResponse = await request(app).get("/api/auth/csrf-token");
    const csrfCookie = getCookieValue(tokenResponse.headers["set-cookie"], "csrfToken");

    const response = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [`csrfToken=${csrfCookie}`, "refreshToken=fake-refresh"]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/invalid csrf token/i);
  });

  test("allows request through csrf layer when header matches cookie", async () => {
    const tokenResponse = await request(app).get("/api/auth/csrf-token");
    const csrfCookie = getCookieValue(tokenResponse.headers["set-cookie"], "csrfToken");

    const response = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [`csrfToken=${csrfCookie}`, "refreshToken=fake-refresh"])
      .set("X-CSRF-Token", csrfCookie);

    // CSRF passes, auth flow handles invalid refresh token
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
