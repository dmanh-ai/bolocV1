import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

const PYTHON_PATH = "/home/z/.venv/bin/python3";
const SCRIPT_PATH = "/home/z/my-project/python_api/stock_api.py";

interface PythonResult {
  data?: any[];
  count?: number;
  error?: string;
  [key: string]: any;
}

function runPythonScript(args: string[]): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(PYTHON_PATH, [SCRIPT_PATH, ...args]);
    
    let stdout = "";
    let stderr = "";
    
    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    process.on("close", (code) => {
      if (code !== 0) {
        console.error("Python stderr:", stderr);
        reject(new Error(stderr || `Process exited with code ${code}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        console.error("Failed to parse stdout:", stdout);
        reject(new Error("Failed to parse Python output"));
      }
    });
    
    process.on("error", (err) => {
      reject(err);
    });
    
    // Set timeout
    setTimeout(() => {
      process.kill();
      reject(new Error("Timeout"));
    }, 120000);
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  
  try {
    let result: PythonResult;
    
    switch (action) {
      case "list":
        result = await runPythonScript(["list"]);
        break;
        
      case "by_exchange":
        const exchange = searchParams.get("exchange") || "HOSE";
        result = await runPythonScript(["by_exchange", exchange]);
        break;
        
      case "industries":
        result = await runPythonScript(["industries"]);
        break;
        
      case "price_history":
        const symbol = searchParams.get("symbol");
        const start = searchParams.get("start") || "";
        const end = searchParams.get("end") || "";
        if (!symbol) throw new Error("Symbol is required");
        result = await runPythonScript(["price_history", symbol, start, end]);
        break;
        
      case "intraday":
        const sym = searchParams.get("symbol");
        if (!sym) throw new Error("Symbol is required");
        result = await runPythonScript(["intraday", sym]);
        break;
        
      case "ratios":
        const symRatios = searchParams.get("symbol");
        if (!symRatios) throw new Error("Symbol is required");
        result = await runPythonScript(["ratios", symRatios]);
        break;
        
      case "finance":
        const symFinance = searchParams.get("symbol");
        if (!symFinance) throw new Error("Symbol is required");
        result = await runPythonScript(["finance", symFinance]);
        break;
        
      case "company":
        const symCompany = searchParams.get("symbol");
        if (!symCompany) throw new Error("Symbol is required");
        result = await runPythonScript(["company", symCompany]);
        break;
        
      case "company_profile":
        const symProfile = searchParams.get("symbol");
        if (!symProfile) throw new Error("Symbol is required");
        result = await runPythonScript(["company_profile", symProfile]);
        break;
        
      case "trading_stats":
        const symTrading = searchParams.get("symbol");
        if (!symTrading) throw new Error("Symbol is required");
        result = await runPythonScript(["trading_stats", symTrading]);
        break;
        
      case "top_gainers":
        result = await runPythonScript(["top_gainers"]);
        break;
        
      case "top_losers":
        result = await runPythonScript(["top_losers"]);
        break;
        
      case "top_value":
        result = await runPythonScript(["top_value"]);
        break;
        
      case "market_pe":
        result = await runPythonScript(["market_pe"]);
        break;
        
      case "market_pb":
        result = await runPythonScript(["market_pb"]);
        break;
        
      case "search":
        const q = searchParams.get("q") || "";
        result = await runPythonScript(["search", q]);
        break;
        
      case "screener":
        result = await runPythonScript(["screener"]);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: any) {
    console.error("Error in stocks API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch data" },
      { status: 500 }
    );
  }
}
