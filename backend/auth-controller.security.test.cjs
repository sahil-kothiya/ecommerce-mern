const createResponseMock = () => {
  const response = {};
  response.cookie = jest.fn();
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

describe("AuthController security responses", () => {
  let AuthController;
  let AppError;

  beforeAll(async () => {
    const controllerModule =
      await import("./src/controllers/AuthController.js");
    const errorModule = await import("./src/middleware/errorHandler.js");
    AuthController = controllerModule.AuthController;
    AppError = errorModule.AppError;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("login response does not expose access or refresh tokens in body", async () => {
    const controller = new AuthController();
    controller.logAction = jest.fn();
    controller.service.login = jest.fn().mockResolvedValue({
      user: { _id: "u1", email: "admin@example.com", role: "admin" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: "15m",
      refreshExpiresIn: "30d",
    });

    const request = {
      body: {
        email: "admin@example.com",
        password: "Password123",
        rememberMe: true,
      },
    };

    const response = createResponseMock();
    const next = jest.fn();

    controller.login(request, response, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
    expect(response.cookie).toHaveBeenCalled();

    const payload = response.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.user).toBeDefined();
    expect(payload.data.expiresIn).toBe("15m");
    expect(payload.data.refreshExpiresIn).toBe("30d");
    expect(payload.data.token).toBeUndefined();
    expect(payload.data.accessToken).toBeUndefined();
    expect(payload.data.refreshToken).toBeUndefined();
  });

  test("refresh token endpoint accepts cookie only", async () => {
    const controller = new AuthController();
    controller.logAction = jest.fn();

    const response = createResponseMock();
    const next = jest.fn();

    controller.refreshToken(
      {
        body: { refreshToken: "body-refresh-token" },
        cookies: {},
      },
      response,
      next,
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalled();
    const firstError = next.mock.calls[0][0];
    expect(firstError).toBeInstanceOf(AppError);
    expect(firstError.statusCode).toBe(401);

    next.mockClear();
    controller.service.refreshAccessToken = jest.fn().mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: "15m",
      refreshExpiresIn: "30d",
      user: { _id: "u1", email: "admin@example.com", role: "admin" },
    });

    controller.refreshToken(
      {
        body: { refreshToken: "body-refresh-token" },
        cookies: { refreshToken: "cookie-refresh-token" },
      },
      response,
      next,
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
    expect(controller.service.refreshAccessToken).toHaveBeenCalledWith(
      "cookie-refresh-token",
    );

    const payload = response.json.mock.calls[0][0];
    expect(payload.data.accessToken).toBeUndefined();
    expect(payload.data.refreshToken).toBeUndefined();
  });
});
