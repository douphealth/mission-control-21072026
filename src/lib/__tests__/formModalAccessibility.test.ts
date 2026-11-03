import { describe, expect, it, vi } from "vitest";
import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FormModal, {
  FormField,
  FormInput,
  FormSelect,
  FormTagsInput,
  FormTextarea,
} from "@/components/FormModal";

// A server render has no portal destination. Keep the real Radix root, content,
// title and close controls; inline only the portal so their markup is inspectable.
vi.mock("@/components/ui/dialog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/dialog")>();
  return {
    ...actual,
    DialogPortal: ({ children }: { children: ReactNode }) =>
      createElement(Fragment, null, children),
  };
});

describe("Form modal keyboard boundary", () => {
  it("exposes a named modal and preserves the visible close and save controls", () => {
    const html = renderToStaticMarkup(
      createElement(FormModal, {
        open: true,
        title: "Edit Payment",
        onClose: () => {},
        onSubmit: () => {},
        submitLabel: "Save record",
        children: "Record details",
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(html).toContain(`<h2 id="${titleId}"`);
    expect(html).toContain('aria-label="Close Edit Payment"');
    expect(html).toContain("h-11 w-11");
    expect(html).toContain("Cancel</button>");
    expect(html).toContain("Save record</button>");
  });

  it("does not leave a dialog boundary behind when closed", () => {
    const html = renderToStaticMarkup(
      createElement(FormModal, {
        open: false,
        title: "Edit Payment",
        onClose: () => {},
        children: "Record details",
      }),
    );
    expect(html).not.toContain('role="dialog"');
  });
});

describe("Shared form fields have programmatic labels", () => {
  const noop = () => {};
  it.each([
    ["Title", createElement(FormInput, { value: "Hosting", onChange: noop }), "input"],
    [
      "Notes",
      createElement(FormTextarea, { value: "Receipt recorded", onChange: noop }),
      "textarea",
    ],
    [
      "Status",
      createElement(FormSelect, {
        value: "pending",
        onChange: noop,
        options: [{ value: "pending", label: "Pending" }],
      }),
      "select",
    ],
    ["Tags", createElement(FormTagsInput, { value: ["operations"], onChange: noop }), "input"],
  ] as const)("associates %s with its editable control", (label, child, tag) => {
    const html = renderToStaticMarkup(createElement(FormField, { label, children: child }));
    const controlId = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
    const labelId = html.match(/<label[^>]*id="([^"]+)"/)?.[1];
    expect(controlId).toBeTruthy();
    expect(labelId).toBeTruthy();
    expect(html).toContain(`<${tag} id="${controlId}"`);
    expect(html).toContain(`aria-labelledby="${labelId}"`);
    expect(html).toContain(`>${label}</label>`);
  });

  it("uses separate IDs for repeated field names and does not wrap buttons in labels", () => {
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(FormField, {
          label: "Title",
          children: createElement(FormInput, { value: "One", onChange: noop }),
        }),
        createElement(FormField, {
          label: "Title",
          children: createElement(FormInput, { value: "Two", onChange: noop }),
        }),
        createElement(FormField, {
          label: "Color",
          children: createElement("button", { type: "button" }, "Blue"),
        }),
      ),
    );
    const labelTargets = [...html.matchAll(/<label[^>]*for="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(labelTargets).size).toBe(3);
    expect(html).not.toMatch(/<label[^>]*>[^<]*<button/);
    expect(html).toContain("Color</label><button");
  });
});
