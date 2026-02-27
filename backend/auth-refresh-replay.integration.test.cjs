const request = require("supertest");

const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === "true";
const describeIfEnabled = runDbIntegration ? describe : describe.skip;

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

    const firstRefreshResponse = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [`refreshToken=${firstRefreshToken}`])
      .send({ refreshToken: firstRefreshToken });

    expect(firstRefreshResponse.status).toBe(200);
    expect(firstRefreshResponse.body?.data?.refreshToken).toBeUndefined();

    const rotatedRefreshToken = getCookieValue(
      firstRefreshResponse.headers["set-cookie"],
      "refreshToken",
    );
    expect(rotatedRefreshToken).toBeTruthy();
    expect(rotatedRefreshToken).not.toBe(firstRefreshToken);

    const replayResponse = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [`refreshToken=${firstRefreshToken}`])
      .send({ refreshToken: firstRefreshToken });

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

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [
        `accessToken=${accessToken}`,
        `refreshToken=${refreshToken}`,
      ]);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const reusedTokenResponse = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

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
