const request = require("supertest");

const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "true";
const describeIfEnabled = runDbIntegration ? describe : describe.skip;

// [FIX] Helper to obtain a fresh CSRF token from the server before each protected POST
const getCsrfToken = async (appInstance) => {
  const res = await request(appInstance).get("/api/auth/csrf-token");
  const setCookieArr = res.headers["set-cookie"];
  const arr = Array.isArray(setCookieArr)
    ? setCookieArr
    : setCookieArr
      ? [setCookieArr]
      : [];
  return getCookieValue(arr, "csrfToken");
};

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

describeIfEnabled("Refresh token replay protection (integration)", () => {
  let app;
  let connectDB;
  let disconnectDB;
  let User;
  const testEmail = "replay-test@example.com";

  beforeAll(async () => {
    process.env.NODE_ENV = "test";

    const appModule = await import("./src/app.js");
    const databaseModule = await import("./src/config/database.js");
    const userModule = await import("./src/models/User.js");

    app = appModule.default;
    connectDB = databaseModule.connectDB;
    disconnectDB = databaseModule.disconnectDB;
    User = userModule.User;

    await connectDB();
  }, 30_000);

  afterAll(async () => {
    await User.deleteMany({ email: testEmail });
    await disconnectDB();
  });

  test("rejects replay of old refresh token after rotation", async () => {
    await User.deleteMany({ email: testEmail });

    await request(app).post("/api/auth/register").send({
      name: "Replay Test User",
      email: testEmail,
      password: "Password123",
      confirmPassword: "Password123",
    });

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "Password123",
      rememberMe: true,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body?.data?.refreshToken).toBeUndefined();

    const firstRefreshToken = getCookieValue(
      loginResponse.headers["set-cookie"],
      "refreshToken",
    );
    expect(firstRefreshToken).toBeTruthy();

    // [FIX] CSRF protection is active on all /api routes; must send csrfToken cookie + x-csrf-token header
    const csrfToken1 = await getCsrfToken(app);
    const firstRefreshResponse = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [
        `refreshToken=${firstRefreshToken}`,
        `csrfToken=${csrfToken1}`,
      ])
      .set("x-csrf-token", csrfToken1)
      .send();

    expect(firstRefreshResponse.status).toBe(200);
    expect(firstRefreshResponse.body?.data?.refreshToken).toBeUndefined();

    const rotatedRefreshToken = getCookieValue(
      firstRefreshResponse.headers["set-cookie"],
      "refreshToken",
    );
    expect(rotatedRefreshToken).toBeTruthy();
    expect(rotatedRefreshToken).not.toBe(firstRefreshToken);

    // [FIX] Replay also needs CSRF to reach the auth logic (expected to fail with 401, not 403)
    const csrfToken2 = await getCsrfToken(app);
    const replayResponse = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [
        `refreshToken=${firstRefreshToken}`,
        `csrfToken=${csrfToken2}`,
      ])
      .set("x-csrf-token", csrfToken2)
      .send();

    expect(replayResponse.status).toBe(401);
    expect(replayResponse.body.success).toBe(false);
    expect(replayResponse.body.message).toMatch(/invalid refresh token/i);

    const dbUser = await User.findOne({ email: testEmail }).select(
      "+refreshToken",
    );
    expect(dbUser).toBeTruthy();
    expect(dbUser.refreshToken).toBeTruthy();
    expect(dbUser.refreshToken).not.toBe(rotatedRefreshToken);
    expect(dbUser.refreshToken).not.toBe(firstRefreshToken);
  });

  test("revokes refresh token on logout and blocks reuse", async () => {
    await User.deleteMany({ email: testEmail });

    await request(app).post("/api/auth/register").send({
      name: "Replay Test User",
      email: testEmail,
      password: "Password123",
      confirmPassword: "Password123",
    });

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "Password123",
      rememberMe: true,
    });

    expect(loginResponse.status).toBe(200);

    const refreshToken = getCookieValue(
      loginResponse.headers["set-cookie"],
      "refreshToken",
    );
    expect(refreshToken).toBeTruthy();

    const accessToken = getCookieValue(
      loginResponse.headers["set-cookie"],
      "accessToken",
    );
    expect(accessToken).toBeTruthy();

    // [FIX] Logout sends session cookies so CSRF protection applies
    const csrfTokenLogout = await getCsrfToken(app);
    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [
        `accessToken=${accessToken}`,
        `refreshToken=${refreshToken}`,
        `csrfToken=${csrfTokenLogout}`,
      ])
      .set("x-csrf-token", csrfTokenLogout);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    // [FIX] Reuse-after-logout also needs CSRF to reach the auth check (expected to fail with 401)
    const csrfTokenReuse = await getCsrfToken(app);
    const reusedTokenResponse = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [
        `refreshToken=${refreshToken}`,
        `csrfToken=${csrfTokenReuse}`,
      ])
      .set("x-csrf-token", csrfTokenReuse);

    expect(reusedTokenResponse.status).toBe(401);
    expect(reusedTokenResponse.body.success).toBe(false);
    expect(reusedTokenResponse.body.message).toMatch(/invalid refresh token/i);

    const dbUser = await User.findOne({ email: testEmail }).select(
      "+refreshToken",
    );
    expect(dbUser).toBeTruthy();
    expect(dbUser.refreshToken).toBeUndefined();
  });
});
