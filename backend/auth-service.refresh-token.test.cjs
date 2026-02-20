const bcrypt = require("bcryptjs");

describe("AuthService refresh token hashing", () => {
  let AuthService;
  let User;

  beforeAll(async () => {
    const serviceModule = await import("./src/services/AuthService.js");
    const userModule = await import("./src/models/User.js");
    AuthService = serviceModule.AuthService;
    User = userModule.User;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("stores hashed refresh token when rememberMe is enabled", async () => {
    const service = new AuthService();
    const hashedPassword = await bcrypt.hash("Password123", 10);

    const user = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
      status: "active",
      password: hashedPassword,
      toObject: () => ({
        _id: "507f1f77bcf86cd799439011",
        email: "user@example.com",
        role: "user",
        status: "active",
      }),
    };

    jest.spyOn(User, "findOne").mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const updateSpy = jest
      .spyOn(User, "findByIdAndUpdate")
      .mockResolvedValue({});

    const result = await service.login("user@example.com", "Password123", true);

    expect(result.refreshToken).toBeDefined();
    expect(updateSpy).toHaveBeenCalled();

    const dbUpdatePayload = updateSpy.mock.calls[0][1];
    expect(dbUpdatePayload.refreshToken).toBeDefined();
    expect(dbUpdatePayload.refreshToken).not.toBe(result.refreshToken);
  });

  test("validates incoming refresh token against hashed value and rotates token", async () => {
    const service = new AuthService();
    const user = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
      status: "active",
      toObject: () => ({
        _id: "507f1f77bcf86cd799439011",
        email: "user@example.com",
        role: "user",
        status: "active",
      }),
    };

    const refreshToken = service.generateRefreshToken(user);
    const storedHash = service.hashRefreshToken(refreshToken);

    jest.spyOn(User, "findById").mockReturnValue({
      select: jest.fn().mockResolvedValue({
        ...user,
        refreshToken: storedHash,
      }),
    });

    const updateSpy = jest
      .spyOn(User, "findByIdAndUpdate")
      .mockResolvedValue({});

    const result = await service.refreshAccessToken(refreshToken);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(updateSpy).toHaveBeenCalled();

    const dbUpdatePayload = updateSpy.mock.calls[0][1];
    expect(dbUpdatePayload.refreshToken).toBe(
      service.hashRefreshToken(result.refreshToken),
    );
  });
});
