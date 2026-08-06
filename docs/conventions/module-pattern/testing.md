---
type: Convention
title: "Test file: <name>.test.ts"
description: Vitest unit tests for the service layer only, with the repository module mocked to keep the DB out of unit tests.
tags: [backend, api, module-pattern, testing]
status: stable
generated: { by: claude-code/sonnet-5, at: 2026-08-06T00:00:00Z }
---

# Rule

Test the [service](service.md) only. Mock the
[repository](repository.md) module — keep the DB out of unit tests.

# Example

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWidget } from "./widgets.service";
import * as repo from "./widgets.repository";

vi.mock("./widgets.repository");

beforeEach(() => vi.resetAllMocks());

describe("getWidget", () => {
  it("returns the widget when found", async () => {
    vi.mocked(repo.findWidgetById).mockResolvedValue({
      id: "abc",
      label: "test",
      createdAt: new Date(),
    });
    const result = await getWidget("abc");
    expect(result.label).toBe("test");
  });

  it("throws 404 when not found", async () => {
    vi.mocked(repo.findWidgetById).mockResolvedValue(null);
    await expect(getWidget("missing")).rejects.toMatchObject({ status: 404 });
  });
});
```

This is the last file added when scaffolding a module; see the
[module pattern overview](index.md) for the full file order.
