import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { z } from "zod";
import useAppForm from "hooks/useAppForm";
import { Button, CtaButton, SelectBox, TextInput } from "components/ui";

describe("ui components", () => {
  it("Field shows label, required mark and error only when given", () => {
    const { container, rerender } = render(<TextInput name="a" />);
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector(".error")).toBeNull();

    rerender(
      <TextInput name="a" label="some.label" required error="some.error" />
    );
    expect(screen.getByText("some.label")).toHaveClass("required");
    expect(screen.getByText("some.error")).toBeInTheDocument();
    expect(container.querySelector(".labeled")).toHaveClass("has-error");
  });

  it("bound fields show their own validation error and keep numbers", async () => {
    const onSubmit = vi.fn();
    const schema = z.object({ amount: z.number("errors.amountEmpty") });
    const Form = () => {
      const { control, handleSubmit } = useAppForm(schema, {});
      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextInput name="amount" control={control} type="number" label="a" />
          <CtaButton>save</CtaButton>
        </form>
      );
    };
    render(<Form />);
    const input = screen.getByRole("spinbutton");

    fireEvent.blur(input);
    expect(await screen.findByText("errors.amountEmpty")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "12.5" } });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ amount: 12.5 }, expect.anything())
    );
    expect(screen.queryByText("errors.amountEmpty")).toBeNull();
  });

  it("Button does not submit by default, CtaButton does", () => {
    render(
      <>
        <Button>plain</Button>
        <CtaButton>cta</CtaButton>
      </>
    );
    expect(screen.getByText("plain")).toHaveAttribute("type", "button");
    expect(screen.getByText("cta")).toHaveAttribute("type", "submit");
  });

  it("filterable SelectBox narrows options and sends the picked value", () => {
    const onSubmit = vi.fn();
    const Form = () => {
      const { control, handleSubmit } = useAppForm(
        z.object({ accountId: z.number() }),
        { accountId: 0 }
      );
      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <SelectBox
            name="accountId"
            control={control}
            filterable
            emptyOption="general.no"
            options={[
              { value: 1, label: "Cash" },
              { value: 2, label: "Savings" },
              { value: 3, label: "Savings joint" },
            ]}
          />
          <CtaButton>save</CtaButton>
        </form>
      );
    };
    render(<Form />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("general.no");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "sav" } });
    expect(screen.queryByText("Cash")).toBeNull();
    expect(screen.getByText("Savings joint")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("Savings joint");

    // still focused after the pick: a click reopens the list
    fireEvent.click(input);
    fireEvent.mouseDown(screen.getByText("Cash"));
    expect(input).toHaveValue("Cash");

    fireEvent.click(screen.getByText("save"));
    return vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ accountId: 1 }, expect.anything())
    );
  });
});
