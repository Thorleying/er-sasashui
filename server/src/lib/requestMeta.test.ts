import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { clientIp, clientUserAgent, normalizeIp } from "./requestMeta.js";

function mockReq(input: {
  remoteAddress?: string;
  headers?: Record<string, string | string[] | undefined>;
}): Request {
  return {
    socket: { remoteAddress: input.remoteAddress ?? "127.0.0.1" },
    headers: input.headers ?? {},
  } as Request;
}

describe("normalizeIp", () => {
  it("去 IPv4-mapped 与 ::1", () => {
    expect(normalizeIp("::ffff:192.168.1.2")).toBe("192.168.1.2");
    expect(normalizeIp("::1")).toBe("127.0.0.1");
  });
});

describe("clientIp", () => {
  it("优先 X-Forwarded-For 第一个地址", () => {
    expect(
      clientIp(
        mockReq({
          remoteAddress: "10.0.0.1",
          headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
        }),
      ),
    ).toBe("203.0.113.9");
  });

  it("其次 X-Real-IP", () => {
    expect(
      clientIp(
        mockReq({
          headers: { "x-real-ip": "198.51.100.4" },
        }),
      ),
    ).toBe("198.51.100.4");
  });
});

describe("clientUserAgent", () => {
  it("读取并截断 User-Agent", () => {
    expect(
      clientUserAgent(
        mockReq({
          headers: { "user-agent": "Mozilla/5.0 Test" },
        }),
      ),
    ).toBe("Mozilla/5.0 Test");
    expect(clientUserAgent(mockReq({ headers: {} }))).toBeNull();
  });
});
