/**
 * Tests for openspec/changes/02-etf-list/specs/etf-list/spec.md
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Etf } from "./etf-schema";
import { BASE_ETF } from "./test-fixtures";

// afterEach cleanup must be registered after all imports (CR-9).
afterEach(cleanup);

// Mock Next.js font loader — not available in jsdom.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans", className: "" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", className: "" }),
}));

// Mock Next.js navigation so jsdom doesn't crash when components import it.
// mockSearchParamsRef allows per-test overrides for searchParams content.
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParamsRef: { search: string } = { search: "" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsRef.search),
  usePathname: () => "/etfs",
  redirect: vi.fn(),
}));

// Mock next/link so it renders as a plain <a> in jsdom (CR-7).
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// --------------------------------------------------------------------------
// 1. AUM formatter
// --------------------------------------------------------------------------
import { formatAum } from "./format-aum";

describe("formatAum", () => {
  it("formats a value in the millions as $NNNm (e.g. 980 → $980M)", () => {
    expect(formatAum(980)).toBe("$980M");
  });

  it("formats a value in the billions with one decimal (e.g. 12400 → $12.4B)", () => {
    expect(formatAum(12400)).toBe("$12.4B");
  });

  it("rounds to one decimal place (e.g. 1050 → $1.1B)", () => {
    expect(formatAum(1050)).toBe("$1.1B");
  });
});

// --------------------------------------------------------------------------
// 2. Root redirect — Scenario: Root redirect
// --------------------------------------------------------------------------
describe("app/page.tsx — root redirect", () => {
  it("calls redirect('/etfs') so GET / sends the browser to /etfs", async () => {
    const nav = await import("next/navigation");
    const redirectSpy = vi.mocked(nav.redirect);
    redirectSpy.mockClear();

    // Render the page component; redirect is called inside the function body.
    const { default: HomePage } = await import("../app/page");
    render(<HomePage />);

    expect(redirectSpy).toHaveBeenCalledWith("/etfs");
  });
});

// --------------------------------------------------------------------------
// 3. EtfTable
// --------------------------------------------------------------------------
import EtfTable from "../components/EtfTable";

const TWENTY_ETFS: Etf[] = Array.from({ length: 20 }, (_, i) => ({
  ...BASE_ETF,
  ticker: `ETF${String(i).padStart(2, "0")}`,
  name: `Fund ${i}`,
}));

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSearchParamsRef.search = "";
});

// Scenario: All required columns are present
describe("EtfTable — 8 required column headers", () => {
  it("renders exactly the 8 required column headers", () => {
    render(
      <EtfTable
        items={TWENTY_ETFS}
        sortBy="name"
        sortDir="asc"
      />,
    );
    const required = [
      "Ticker",
      "Name",
      "Issuer",
      "Asset Class",
      "Region",
      "TER %",
      "AUM",
      "1Y Return",
    ];
    for (const col of required) {
      expect(screen.getByRole("columnheader", { name: col })).toBeDefined();
    }
  });
});

// Scenario: Row links to detail page
describe("EtfTable — row links to /etfs/[ticker]", () => {
  it("every row contains a link to /etfs/[ticker] for that ETF", () => {
    render(
      <EtfTable
        items={TWENTY_ETFS}
        sortBy="name"
        sortDir="asc"
      />,
    );
    const links = screen.getAllByRole("link");
    for (const etf of TWENTY_ETFS) {
      const href = `/etfs/${etf.ticker}`;
      expect(links.some((l) => l.getAttribute("href") === href)).toBe(true);
    }
  });
});

// Scenario: Clicking a column header sorts ascending
describe("EtfTable — sort state in aria-sort and URL", () => {
  it("the active sort column header has aria-sort='ascending'", () => {
    render(
      <EtfTable
        items={TWENTY_ETFS}
        sortBy="name"
        sortDir="asc"
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort"),
    ).toBe("ascending");
  });

  it("clicking an inactive column header pushes sortBy=<col>&sortDir=asc to the URL", () => {
    render(
      <EtfTable
        items={TWENTY_ETFS}
        sortBy="name"
        sortDir="asc"
      />,
    );
    const tickerHeader = screen.getByRole("columnheader", { name: "Ticker" });
    fireEvent.click(tickerHeader.querySelector("button")!);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/sortBy=ticker.*sortDir=asc|sortDir=asc.*sortBy=ticker/),
    );
  });
});

// Scenario: Clicking the active column header toggles to descending
describe("EtfTable — toggle sort direction", () => {
  it("clicking the currently-sorted header sets sortDir=desc in the URL", () => {
    render(
      <EtfTable
        items={TWENTY_ETFS}
        sortBy="ticker"
        sortDir="asc"
      />,
    );
    const tickerHeader = screen.getByRole("columnheader", { name: "Ticker" });
    fireEvent.click(tickerHeader.querySelector("button")!);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("sortDir=desc"),
    );
  });
});

// Scenario: Sort state survives page reload (URL is the only source of truth)
describe("EtfTable — sort from URL props", () => {
  it("renders aria-sort='descending' on the AUM header when sortBy=aum&sortDir=desc", () => {
    render(
      <EtfTable
        items={TWENTY_ETFS}
        sortBy="aum"
        sortDir="desc"
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "AUM" }).getAttribute("aria-sort"),
    ).toBe("descending");
  });
});

// Scenario: Empty filtered result
// EtfTable computes hasFilters internally from useSearchParams; override the ref for these tests.
describe("EtfTable — empty state when filters active", () => {
  beforeEach(() => {
    mockSearchParamsRef.search = "search=foo";
  });

  it("shows 'No ETFs match your filters.' when items is empty and filters are active", () => {
    render(<EtfTable items={[]} sortBy="name" sortDir="asc" />);
    expect(screen.getByText("No ETFs match your filters.")).toBeDefined();
  });

  it("shows a 'Clear filters' button in the empty state", () => {
    render(<EtfTable items={[]} sortBy="name" sortDir="asc" />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeDefined();
  });
});

// Scenario: Clear filters button resets the view
describe("EtfTable — clear filters resets URL", () => {
  beforeEach(() => {
    mockSearchParamsRef.search = "search=foo";
  });

  it("clicking 'Clear filters' navigates to /etfs with no params", () => {
    render(<EtfTable items={[]} sortBy="name" sortDir="asc" />);
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(mockReplace).toHaveBeenCalledWith("/etfs");
  });
});

// --------------------------------------------------------------------------
// 4. EtfPagination
// --------------------------------------------------------------------------
import EtfPagination from "../components/EtfPagination";

// Scenario: Default page shows first 20 rows / "Showing X–Y of N"
describe("EtfPagination — Showing X–Y of N count", () => {
  it("shows 'Showing 1–20 of 55' on page 1 when total is 55", () => {
    render(<EtfPagination page={1} total={55} pageSize={20} />);
    expect(screen.getByText("Showing 1–20 of 55")).toBeDefined();
  });

  it("shows 'Showing 21–40 of 55' on page 2", () => {
    render(<EtfPagination page={2} total={55} pageSize={20} />);
    expect(screen.getByText("Showing 21–40 of 55")).toBeDefined();
  });

  it("renders nothing when total is 0 (empty state handled by EtfTable)", () => {
    const { container } = render(<EtfPagination page={1} total={0} pageSize={20} />);
    expect(container.firstChild).toBeNull();
  });
});

// Scenario: Previous disabled on page 1
describe("EtfPagination — Previous button", () => {
  it("Previous button is disabled on page 1", () => {
    render(<EtfPagination page={1} total={55} pageSize={20} />);
    expect(screen.getByRole("button", { name: /previous/i })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

// Scenario: Clicking Next updates URL with page=2
describe("EtfPagination — Next button", () => {
  it("clicking Next pushes page=2 to the URL", () => {
    render(<EtfPagination page={1} total={55} pageSize={20} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("shows the current page number", () => {
    render(<EtfPagination page={2} total={55} pageSize={20} />);
    expect(screen.getByText(/page 2/i)).toBeDefined();
  });
});

// --------------------------------------------------------------------------
// 5. Disclaimer banner — app/layout.tsx
// --------------------------------------------------------------------------
import RootLayout from "../app/layout";

// Scenario: Banner present on the list page and on page 2
describe("RootLayout — disclaimer banner present on every page", () => {
  it("renders the banner text 'Demo data — not investment advice'", () => {
    render(
      <RootLayout params={Promise.resolve({})}><div /></RootLayout>,
    );
    expect(
      screen.getByText("Demo data — not investment advice"),
    ).toBeDefined();
  });
});
