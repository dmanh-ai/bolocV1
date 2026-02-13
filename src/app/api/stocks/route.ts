import { NextRequest, NextResponse } from "next/server";
import {
  getStockList,
  getStocksByExchange,
  getIndustries,
  getPriceHistory,
  getIntradayData,
  getCompanyRatios,
  getFinancials,
  getCompanyOverview,
  getTopGainers,
  getTopLosers,
  searchStocks,
  getMarketPE,
  getMarketPB,
  getAllCompanyRatios,
} from "@/lib/vnstock-api";

function validateSymbol(symbol: string | null): symbol is string {
  return !!symbol && /^[A-Za-z0-9]+$/.test(symbol);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";

  try {
    switch (action) {
      case "list": {
        const data = await getStockList();
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case "by_exchange": {
        const exchange = searchParams.get("exchange") || "HOSE";
        const data = await getStocksByExchange(exchange);
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case "industries": {
        const data = await getIndustries();
        return NextResponse.json({ success: true, data });
      }

      case "price_history": {
        const symbol = searchParams.get("symbol");
        if (!validateSymbol(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }
        const data = await getPriceHistory(symbol);
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case "intraday": {
        const symbol = searchParams.get("symbol");
        if (!validateSymbol(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }
        const data = await getIntradayData(symbol);
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case "ratios": {
        const symbol = searchParams.get("symbol");
        if (!validateSymbol(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }
        const ratios = await getCompanyRatios(symbol);
        return NextResponse.json({
          success: true,
          key_metrics: ratios,
        });
      }

      case "finance": {
        const symbol = searchParams.get("symbol");
        if (!validateSymbol(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }
        const [balance, income, cashflow] = await Promise.all([
          getFinancials(symbol, "balance_sheet").catch(() => []),
          getFinancials(symbol, "income_statement").catch(() => []),
          getFinancials(symbol, "cash_flow").catch(() => []),
        ]);
        return NextResponse.json({
          success: true,
          data: { balance_sheet: balance, income_statement: income, cash_flow: cashflow },
        });
      }

      case "company":
      case "company_profile": {
        const symbol = searchParams.get("symbol");
        if (!validateSymbol(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }
        const data = await getCompanyOverview(symbol);
        return NextResponse.json({ success: true, data });
      }

      case "trading_stats": {
        const symbol = searchParams.get("symbol");
        if (!validateSymbol(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }
        const all = await getStockList();
        const stock = all.find(
          (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
        );
        return NextResponse.json({ success: true, data: stock || null });
      }

      case "top_gainers": {
        const data = await getTopGainers();
        return NextResponse.json({ success: true, data });
      }

      case "top_losers": {
        const data = await getTopLosers();
        return NextResponse.json({ success: true, data });
      }

      case "market_pe": {
        const data = await getMarketPE();
        return NextResponse.json({ success: true, data });
      }

      case "market_pb": {
        const data = await getMarketPB();
        return NextResponse.json({ success: true, data });
      }

      case "search": {
        const q = searchParams.get("q") || "";
        if (!q) {
          return NextResponse.json({ success: true, data: [] });
        }
        const data = await searchStocks(q);
        return NextResponse.json({
          success: true,
          data,
          count: data.length,
        });
      }

      case "screener": {
        const ratios = await getAllCompanyRatios();
        const stocks = await getStockList();
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
            };
          });

        return NextResponse.json({
          success: true,
          data: enriched,
          count: enriched.length,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch data";
    console.error("Error in stocks API:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
