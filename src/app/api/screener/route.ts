import { NextResponse } from "next/server";
import { getAllCompanyRatios, getStockList } from "@/lib/vnstock-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const [ratios, stocks] = await Promise.all([
      getAllCompanyRatios(),
      getStockList(),
    ]);

    const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

    const enriched = ratios
      .filter((r) => r.symbol && stockMap.has(r.symbol))
      .map((r) => {
        const stock = stockMap.get(r.symbol)!;
        return {
          symbol: r.symbol,
          close_price: stock.close_price,
          price_change_pct: stock.price_change_pct,
          total_volume: stock.total_volume,
          exchange: stock.exchange,
          pe: r.pe,
          pb: r.pb,
          roe: r.roe,
          roa: r.roa,
          eps: r.eps,
          market_cap: r.market_cap,
        };
      })
      .sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0))
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch screener data";
    console.error("Error fetching screener data:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
