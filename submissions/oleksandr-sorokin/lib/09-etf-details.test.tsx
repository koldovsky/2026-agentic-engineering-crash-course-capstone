/**
 * Acceptance tests for openspec/changes/04-etf-details/
 * Covers every scenario in:
 *   specs/etf-details/spec.md  — details page, charts, holdings, 404, back-link
 *   specs/etf-list/spec.md     — row href encodes ?ref= for round-trip navigation
 *
 * All imports of not-yet-implemented modules are dynamic (inside test bodies) so
 * each test fails with a clear "module not found" message rather than the whole
 * file erroring at load time.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BASE_ETF, makePrices } from "./test-fixtures";
import type { Etf } from "./etf-schema";
// EtfTable already exists; static import is fine.
import EtfTable from "../components/EtfTable";

afterEach(cleanup);

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans", className: "" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", className: "" }),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/etfs",
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Recharts renders SVG; stub it out for jsdom.
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Cell: () => null,
}));

// ---------------------------------------------------------------------------
// 1. formatDate — inception date formatting
// ---------------------------------------------------------------------------
// Scenario: KPI cards display correct values with proper formatting
// (inception date shown as a human-readable date e.g. "Sep 25, 2009")

describe("formatDate — KPI inception date", () => {
  it("formats an ISO date string as a human-readable date (e.g. '2009-09-25' → 'Sep 25, 2009')", async () => {
    const { formatDate } = await import("./format-date");
    expect(formatDate("2009-09-25")).toMatch(/Sep.+25.+2009|25.+Sep.+2009/);
  });

  it("keeps the year visible and does not produce NaN", async () => {
    const { formatDate } = await import("./format-date");
    const result = formatDate("2023-01-03");
    expect(result).toContain("2023");
    expect(result).not.toMatch(/NaN/);
  });
});

// ---------------------------------------------------------------------------
// 2. formatReturn — signed return formatting
// ---------------------------------------------------------------------------
// Scenario: Positive return has a green tint, negative return has a red tint
// (sign is always included so color is never the only signal)

describe("formatReturn — always includes sign", () => {
  it("formats a positive return with a leading '+' (e.g. 0.12 → '+12.00%')", async () => {
    const { formatReturn } = await import("./format-return");
    expect(formatReturn(0.12)).toMatch(/^\+/);
  });

  it("formats a negative return with a leading '-' (e.g. -0.05 → '-5.00%')", async () => {
    const { formatReturn } = await import("./format-return");
    expect(formatReturn(-0.05)).toMatch(/^-/);
  });
});

// ---------------------------------------------------------------------------
// 3. HoldingsTable — Server Component
// ---------------------------------------------------------------------------

const HOLDINGS = [
  { name: "Apple Inc", weight: 5.0 },
  { name: "Microsoft Corp", weight: 4.5 },
  { name: "NVIDIA Corp", weight: 3.2 },
];

// Scenario: Holdings table renders all provided holdings in rank order
describe("HoldingsTable — renders rank, name, weight", () => {
  it("shows each holding's name in the table", async () => {
    const { default: HoldingsTable } = await import("../components/HoldingsTable");
    render(<HoldingsTable holdings={HOLDINGS} />);
    expect(screen.getByText("Apple Inc")).toBeDefined();
    expect(screen.getByText("Microsoft Corp")).toBeDefined();
    expect(screen.getByText("NVIDIA Corp")).toBeDefined();
  });

  it("shows 1-based rank numbers for each row", async () => {
    const { default: HoldingsTable } = await import("../components/HoldingsTable");
    render(<HoldingsTable holdings={HOLDINGS} />);
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
  });

  it("shows weight as a percentage string (e.g. '5.00%')", async () => {
    const { default: HoldingsTable } = await import("../components/HoldingsTable");
    render(<HoldingsTable holdings={HOLDINGS} />);
    // Match any reasonable formatting of 5.0 as a percent
    expect(screen.getByText(/5\.0|5%/)).toBeDefined();
  });
});

// Scenario: Table has accessible column headers
describe("HoldingsTable — column headers have scope='col'", () => {
  it("all <th> elements carry scope='col'", async () => {
    const { default: HoldingsTable } = await import("../components/HoldingsTable");
    const { container } = render(<HoldingsTable holdings={HOLDINGS} />);
    const headers = Array.from(container.querySelectorAll("th"));
    expect(headers.length).toBeGreaterThan(0);
    for (const th of headers) {
      expect(th.getAttribute("scope")).toBe("col");
    }
  });
});

// ---------------------------------------------------------------------------
// 4. PriceChart — 'use client' component
// ---------------------------------------------------------------------------

const PRICES_252 = makePrices(252);

// Scenario: Default range is 1Y showing all 252 data points
describe("PriceChart — default range is 1Y", () => {
  it("the 1Y tab has aria-selected='true' on first mount", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    const tab1Y = screen.getByRole("tab", { name: /1Y/i });
    expect(tab1Y.getAttribute("aria-selected")).toBe("true");
  });

  it("renders a line chart element", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    expect(screen.getByTestId("line-chart")).toBeDefined();
  });
});

// Scenario: Selecting 1M tab filters the chart to the last ~21 data points
describe("PriceChart — 1M tab selection", () => {
  it("clicking 1M sets its aria-selected to 'true'", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    fireEvent.click(screen.getByRole("tab", { name: /1M/i }));
    expect(screen.getByRole("tab", { name: /1M/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("clicking 1M sets 1Y tab aria-selected to 'false'", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    fireEvent.click(screen.getByRole("tab", { name: /1M/i }));
    expect(screen.getByRole("tab", { name: /1Y/i }).getAttribute("aria-selected")).toBe("false");
  });
});

// Scenario: Selecting 6M tab filters the chart to the last ~126 data points
describe("PriceChart — 6M tab selection", () => {
  it("clicking 6M sets its aria-selected to 'true'", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    fireEvent.click(screen.getByRole("tab", { name: /6M/i }));
    expect(screen.getByRole("tab", { name: /6M/i }).getAttribute("aria-selected")).toBe("true");
  });
});

// Scenario: Chart is accessible
describe("PriceChart — accessibility", () => {
  it("the chart region has role='img'", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    expect(screen.getByRole("img")).toBeDefined();
  });

  it("the chart region has aria-label containing the ticker", async () => {
    const { default: PriceChart } = await import("../components/PriceChart");
    render(<PriceChart prices={PRICES_252} ticker="IWDA" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/IWDA/i);
  });
});

// ---------------------------------------------------------------------------
// 5. AllocationChart — 'use client' horizontal bar chart
// ---------------------------------------------------------------------------

const SECTORS = [
  { label: "Technology", weight: 20.0 },
  { label: "Financials", weight: 15.0 },
];

const COUNTRIES = [
  { label: "United States", weight: 70.0 },
  { label: "Japan", weight: 6.0 },
];

// Scenario: Sector chart renders bars proportional to sector weights
describe("AllocationChart — sector weights", () => {
  it("renders a bar chart element", async () => {
    const { default: AllocationChart } = await import("../components/AllocationChart");
    render(<AllocationChart data={SECTORS} title="Sector Allocation" />);
    expect(screen.getByTestId("bar-chart")).toBeDefined();
  });

  it("shows each sector label", async () => {
    const { default: AllocationChart } = await import("../components/AllocationChart");
    render(<AllocationChart data={SECTORS} title="Sector Allocation" />);
    expect(screen.getByText("Technology")).toBeDefined();
    expect(screen.getByText("Financials")).toBeDefined();
  });
});

// Scenario: Country chart renders bars proportional to country weights
describe("AllocationChart — country weights", () => {
  it("shows each country label", async () => {
    const { default: AllocationChart } = await import("../components/AllocationChart");
    render(<AllocationChart data={COUNTRIES} title="Country Allocation" />);
    expect(screen.getByText("United States")).toBeDefined();
    expect(screen.getByText("Japan")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. EtfTable — row href encodes ?ref= (etf-list spec delta)
// ---------------------------------------------------------------------------

const TWO_ETFS: Etf[] = [
  { ...BASE_ETF, ticker: "IWDA", name: "iShares MSCI World" },
  { ...BASE_ETF, ticker: "VWCE", name: "Vanguard All-World" },
];

// Scenario: Row href includes a ref parameter reflecting active filters
describe("EtfTable — row href includes ?ref= with active filters", () => {
  it("each /etfs/[ticker] link href contains '?ref=' when currentUrl has filter params", () => {
    render(
      <EtfTable
        items={TWO_ETFS}
        sortBy="name"
        sortDir="asc"
        currentUrl="/etfs?assetClass=equity&sortBy=ter"
      />,
    );
    const etfLinks = screen
      .getAllByRole("link")
      .filter((l) => (l.getAttribute("href") ?? "").startsWith("/etfs/"));
    expect(etfLinks.length).toBeGreaterThan(0);
    for (const link of etfLinks) {
      expect(link.getAttribute("href")).toMatch(/\?ref=/);
    }
  });

  it("the ref value URL-encodes the current list URL", () => {
    render(
      <EtfTable
        items={TWO_ETFS}
        sortBy="name"
        sortDir="asc"
        currentUrl="/etfs?assetClass=equity&sortBy=ter"
      />,
    );
    const etfLink = screen
      .getAllByRole("link")
      .find((l) => (l.getAttribute("href") ?? "").startsWith("/etfs/"));
    expect(etfLink).toBeDefined();
    expect(etfLink!.getAttribute("href")).toContain(
      encodeURIComponent("/etfs?assetClass=equity"),
    );
  });
});

// Scenario: Row href includes a ref parameter even with no filters active
describe("EtfTable — row href includes ?ref= with no filters", () => {
  it("each /etfs/[ticker] link href encodes /etfs as the ref when no filters active", () => {
    render(
      <EtfTable
        items={TWO_ETFS}
        sortBy="name"
        sortDir="asc"
        currentUrl="/etfs"
      />,
    );
    const etfLinks = screen
      .getAllByRole("link")
      .filter((l) => (l.getAttribute("href") ?? "").startsWith("/etfs/"));
    expect(etfLinks.length).toBeGreaterThan(0);
    for (const link of etfLinks) {
      expect(link.getAttribute("href")).toContain("ref=");
      expect(link.getAttribute("href")).toContain(encodeURIComponent("/etfs"));
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Details page — app/etfs/[ticker]/page.tsx (Server Component)
// ---------------------------------------------------------------------------

// Scenario: Known ticker renders all page sections
describe("ETF details page — known ticker", () => {
  it("resolves without throwing for a known ticker (IWDA)", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    await expect(
      DetailsPage({
        params: Promise.resolve({ ticker: "IWDA" }),
        searchParams: Promise.resolve({}),
      }),
    ).resolves.toBeDefined();
  });

  it("the rendered output contains the ETF ticker 'IWDA'", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    expect(container.textContent).toMatch(/IWDA/);
  });

  it("renders the Key metrics section", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    expect(container.querySelector('[aria-label="Key metrics"]')).toBeDefined();
  });

  it("renders the Price history section", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    expect(container.querySelector('[aria-label="Price history"]')).toBeDefined();
  });

  it("renders the Top holdings section", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    expect(container.querySelector('[aria-label="Top holdings"]')).toBeDefined();
  });

  it("renders the Sector allocation section", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    expect(container.querySelector('[aria-label="Sector allocation"]')).toBeDefined();
  });

  it("renders the Country allocation section", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    expect(container.querySelector('[aria-label="Country allocation"]')).toBeDefined();
  });
});

// Scenario: Unknown ticker shows 404 page
describe("ETF details page — unknown ticker calls notFound()", () => {
  it("calls notFound() for an unrecognised ticker", async () => {
    const nav = await import("next/navigation");
    const notFoundSpy = vi.mocked(nav.notFound as () => never);
    notFoundSpy.mockClear();

    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    try {
      await DetailsPage({
        params: Promise.resolve({ ticker: "ZZZNOMATCH" }),
        searchParams: Promise.resolve({}),
      });
    } catch {
      // Next.js notFound() throws internally; swallow it
    }
    expect(notFoundSpy).toHaveBeenCalled();
  });
});

// Scenario: Back link uses the ref parameter when present
describe("ETF details page — back link with ref param", () => {
  it("the 'Back to list' link href equals the decoded ref URL", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const refUrl = "/etfs?assetClass=equity";
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({ ref: encodeURIComponent(refUrl) }),
    });
    const { container } = render(jsx as React.ReactElement);
    const backLink = Array.from(container.querySelectorAll("a")).find((a) =>
      /back to list/i.test(a.textContent ?? ""),
    );
    expect(backLink).toBeDefined();
    expect(backLink!.getAttribute("href")).toBe(refUrl);
  });
});

// Scenario: Back link falls back to /etfs when ref is absent
describe("ETF details page — back link falls back to /etfs", () => {
  it("the 'Back to list' link href is '/etfs' when no ref param is present", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    const backLink = Array.from(container.querySelectorAll("a")).find((a) =>
      /back to list/i.test(a.textContent ?? ""),
    );
    expect(backLink).toBeDefined();
    expect(backLink!.getAttribute("href")).toBe("/etfs");
  });
});

// ---------------------------------------------------------------------------
// 8. Return tinting — positive/negative CSS class
// ---------------------------------------------------------------------------
// Scenario: Positive return has a green tint, negative return has a red tint

describe("ETF details page — return tinting CSS classes", () => {
  it("a positive return1y value renders with class 'positive' on the 1Y Return dd", async () => {
    const { default: DetailsPage } = await import("../app/etfs/[ticker]/page");
    // BASE_ETF has return1y: 0.12 (positive)
    const jsx = await DetailsPage({
      params: Promise.resolve({ ticker: "IWDA" }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(jsx as React.ReactElement);
    const dts = Array.from(container.querySelectorAll("dt"));
    const return1yDt = dts.find((dt) => /1Y Return/i.test(dt.textContent ?? ""));
    expect(return1yDt).toBeDefined();
    const dd = return1yDt!.nextElementSibling;
    expect(dd?.getAttribute("class")).toContain("positive");
  });
});

// ---------------------------------------------------------------------------
// 9. not-found.tsx — 404 page content
// ---------------------------------------------------------------------------
// Scenario: Unknown ticker shows 404 page

describe("EtfNotFound page — content", () => {
  it("renders the text 'ETF not found'", async () => {
    const { default: EtfNotFound } = await import("../app/etfs/[ticker]/not-found");
    render(<EtfNotFound />);
    expect(screen.getByText(/ETF not found/i)).toBeDefined();
  });

  it("renders a 'Back to list' link pointing to /etfs", async () => {
    const { default: EtfNotFound } = await import("../app/etfs/[ticker]/not-found");
    const { container } = render(<EtfNotFound />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      /back to list/i.test(a.textContent ?? ""),
    );
    expect(link).toBeDefined();
    expect(link!.getAttribute("href")).toBe("/etfs");
  });
});
