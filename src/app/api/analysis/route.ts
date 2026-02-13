import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

const PYTHON_PATH = "/home/z/.venv/bin/python3";
const ANALYZER_PATH = "/home/z/my-project/python_api/stock_analyzer.py";

interface PythonResult {
  data?: any[];
  error?: string;
  [key: string]: any;
}

function runPythonScript(args: string[]): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(PYTHON_PATH, [ANALYZER_PATH, ...args]);
    
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
    
    setTimeout(() => {
      process.kill();
      reject(new Error("Timeout"));
    }, 300000); // 5 minutes for screening
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "screen";
  
  try {
    let result: PythonResult;
    
    switch (action) {
      case "screen":
        const strategy = searchParams.get("strategy") || "all";
        const topN = searchParams.get("top_n") || "10";
        result = await runPythonScript(["screen", strategy, topN]);
        break;
        
      case "analyze":
        const symbol = searchParams.get("symbol");
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: "Symbol is required" },
            { status: 400 }
          );
        }
        result = await runPythonScript(["analyze", symbol]);
        break;
        
      case "strategies":
        result = await runPythonScript(["strategies"]);
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
    console.error("Error in analysis API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze" },
      { status: 500 }
    );
  }
}
