import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseStatusBadge } from "./case-status-badge";
import { RiskLevelBadge } from "./risk-level-badge";

describe("status & risk badges", () => {
  it("hiển thị nhãn tiếng Việt theo trạng thái", () => {
    render(<CaseStatusBadge status="lawyer_reviewing" />);
    expect(screen.getByText("Luật sư review")).toBeInTheDocument();
  });

  it("hiển thị nhãn rủi ro", () => {
    render(<RiskLevelBadge level="critical" />);
    expect(screen.getByText(/Nghiêm trọng/)).toBeInTheDocument();
  });
});
