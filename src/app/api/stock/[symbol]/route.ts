import { NextResponse } from "next/server";
import {
  getPriceHistory,
  getFinancials,
  getCompanyOverview,
} from "@/lib/vnstock-api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "history";

  if (!/^[A-Za-z0-9]+$/.test(symbol)) {
    return NextResponse.json(
      { success: false, error: "Invalid symbol format" },
      { status: 400 }
    );
  }

  try {
    switch (type) {
      case "history": {
        const data = await getPriceHistory(symbol.toUpperCase());
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case "finance": {
        const [balance, income, cashflow, ratios] = await Promise.all([
          getFinancials(symbol, "balance_sheet").catch(() => []),
          getFinancials(symbol, "income_statement").catch(() => []),
          getFinancials(symbol, "cash_flow").catch(() => []),
          getFinancials(symbol, "ratio").catch(() => []),
        ]);
        return NextResponse.json({
          success: true,
          data: {
            balance_sheet: balance,
            income_statement: income,
            cash_flow: cashflow,
            ratios,
          },
        });
      }

      case "overview": {
        const data = await getCompanyOverview(symbol.toUpperCase());
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stock data";
    console.error("Error fetching stock data:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
