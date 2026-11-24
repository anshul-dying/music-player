import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { Button, IconButton } from "../src";

function renderButton(props: any) {
  return (Button as any).render(props, null);
}

function renderIconButton(props: any) {
  return (IconButton as any).render(props, null);
}

describe("Button & IconButton Loading/Disabled Contrast (#41, #42)", () => {
  test("Button does not include hover:bg-current when disabled or loading", () => {
    // Normal button
    const normal = renderButton({ variant: "secondary", children: "Click me" });
    assert.strictEqual(normal.props.disabled, false);
    assert.ok(
      !normal.props.className?.includes("hover:bg-current"),
      "Normal button must not have hover:bg-current"
    );

    // Disabled button
    const disabledProps = renderButton({ variant: "secondary", disabled: true, children: "Disabled" });
    assert.strictEqual(disabledProps.props.disabled, true);
    assert.ok(
      !disabledProps.props.className.includes("hover:bg-current"),
      "Disabled button must not have hover:bg-current"
    );
    assert.ok(
      disabledProps.props.className.includes("cursor-not-allowed"),
      "Disabled button must have cursor-not-allowed"
    );
    assert.ok(
      disabledProps.props.className.includes("opacity-50"),
      "Disabled button must have opacity-50"
    );

    // Loading button
    const loadingProps = renderButton({
      variant: "outline",
      isLoading: true,
      loadingText: "Verifying...",
      children: "Check Connection",
    });
    assert.strictEqual(loadingProps.props.disabled, true);
    assert.ok(
      !loadingProps.props.className.includes("hover:bg-current"),
      "Loading button must not have hover:bg-current"
    );
    assert.ok(
      loadingProps.props.className.includes("cursor-not-allowed"),
      "Loading button must have cursor-not-allowed"
    );
    assert.ok(
      loadingProps.props.className.includes("opacity-50"),
      "Loading button must have opacity-50"
    );
  });

  test("IconButton does not include hover:bg-current when disabled or loading", () => {
    const props = renderIconButton({
      icon: React.createElement("span", null, "icon"),
      "aria-label": "Test",
      disabled: true,
    });
    assert.strictEqual(props.props.disabled, true);
    assert.ok(!props.props.className.includes("hover:bg-current"));
    assert.ok(props.props.className.includes("cursor-not-allowed"));
  });

  test("All Button variants maintain contrast class structure when loading", () => {
    const variants = [
      "primary",
      "secondary",
      "glass",
      "ghost",
      "outline",
      "danger",
      "pill",
    ] as const;

    for (const variant of variants) {
      const rendered = renderButton({
        variant,
        isLoading: true,
        loadingText: "Loading...",
        children: "Action",
      });
      assert.strictEqual(rendered.props.disabled, true);
      assert.ok(
        !rendered.props.className.includes("hover:bg-current"),
        `Variant ${variant} must not include hover:bg-current`
      );
      assert.ok(
        rendered.props.className.includes("cursor-not-allowed"),
        `Variant ${variant} must include cursor-not-allowed`
      );
    }
  });
});
