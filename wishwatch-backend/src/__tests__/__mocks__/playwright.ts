/**
 * Mocks playwright-core so tests never try to launch a real Chromium browser.
 */
export const chromium = {
  launch: jest.fn().mockResolvedValue({
    newContext: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue(null),
        waitForTimeout: jest.fn().mockResolvedValue(null),
        $$: jest.fn().mockResolvedValue([]),
        $eval: jest.fn().mockRejectedValue(new Error("mock")),
        textContent: jest.fn().mockResolvedValue(""),
        close: jest.fn().mockResolvedValue(null),
      }),
      close: jest.fn().mockResolvedValue(null),
    }),
    close: jest.fn().mockResolvedValue(null),
  }),
};

export default { chromium };
