import { beforeEach, describe, expect, it, vi } from "vitest";

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: toastError,
  },
}));

import { apiClient } from "./apiClient.js";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, "", "/login");
  });

  it("sends requests with cookie credentials by default", async () => {
    const responseHeaders = new Headers({ "content-type": "application/json" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: responseHeaders,
      json: async () => ({ success: true }),
    });

    const result = await apiClient.get("/health");

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/health"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("clears auth state and marks session expired on 401", async () => {
    localStorage.setItem("auth_user", JSON.stringify({ id: "user-1" }));

    const responseHeaders = new Headers({ "content-type": "application/json" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: responseHeaders,
      json: async () => ({ message: "Unauthorized" }),
    });

    await expect(apiClient.get("/api/protected")).rejects.toBeTruthy();

    expect(localStorage.getItem("auth_user")).toBeNull();
    expect(sessionStorage.getItem("sessionExpired")).toBe("true");
    expect(toastError).toHaveBeenCalled();
  });
});
