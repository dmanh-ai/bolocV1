import { NextRequest, NextResponse } from "next/server";
import {
  analyzeStock,
  screenStocks,
  type Strategy,
} from "@/lib/stock-analyzer";

const VALID_STRATEGIES = ["investing", "trading", "speculation", "all"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "screen";

  try {
    switch (action) {
      case "screen": {
        const strategy = searchParams.get("strategy") || "all";
        const topN = parseInt(searchParams.get("top_n") || "10", 10);

        if (!VALID_STRATEGIES.includes(strategy)) {
          return NextResponse.json(
            { success: false, error: `Invalid strategy: ${strategy}` },
            { status: 400 }
          );
        }

        const result = await screenStocks(
          strategy as Strategy | "all",
          topN
        );
        return NextResponse.json({ success: true, ...result });
      }

      case "analyze": {
        const symbol = searchParams.get("symbol");
        if (!symbol || !/^[A-Za-z0-9]+$/.test(symbol)) {
          return NextResponse.json(
            { success: false, error: "Valid symbol is required" },
            { status: 400 }
          );
        }

        const result = await analyzeStock(symbol.toUpperCase());
        return NextResponse.json({ success: true, ...result });
      }

      case "strategies": {
        return NextResponse.json({
          success: true,
          data: {
            investing: {
              name: "Đầu tư dài hạn",
              timeframe: "6 tháng - 1 năm",
              description: "Focus vào fundamentals, định giá hợp lý",
            },
            trading: {
              name: "Trading",
              timeframe: "1 - 3 tuần",
              description: "Focus vào xu hướng kỹ thuật",
            },
            speculation: {
              name: "Đầu cơ",
              timeframe: "2 - 4 tuần",
              description: "Tận dụng biến động, momentum mạnh",
            },
          },
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
      error instanceof Error ? error.message : "Failed to analyze";
    console.error("Error in analysis API:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
