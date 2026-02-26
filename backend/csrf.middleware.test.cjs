const createResponseMock = () => {
  const response = {};
  response.cookie = jest.fn();
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
};

describe("csrfProtection middleware", () => {
  let csrfProtection;
  let AppError;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const csrfModule = await import("./src/middleware/csrf.js");
    const errorModule = await import("./src/middleware/errorHandler.js");
    csrfProtection = csrfModule.csrfProtection;
    AppError = errorModule.AppError;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("sets csrf cookie and allows safe methods", () => {
    const req = {
      method: "GET",
      cookies: {},
      headers: {},
    };
    const res = createResponseMock();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      "csrfToken",
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        path: "/",
      }),
    );
    expect(next).toHaveBeenCalledWith();
  });

  test("blocks state-changing requests when csrf header is missing", () => {
    const req = {
      method: "POST",
      cookies: { accessToken: "fake-access", csrfToken: "csrf-abc" },
      headers: {},
    };
    const res = createResponseMock();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/invalid csrf token/i);
  });

  test("allows state-changing requests with matching csrf token", () => {
    const req = {
      method: "PATCH",
      cookies: { accessToken: "fake-access", csrfToken: "csrf-xyz" },
      headers: { "x-csrf-token": "csrf-xyz" },
    };
    const res = createResponseMock();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
