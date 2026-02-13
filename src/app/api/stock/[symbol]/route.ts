import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const VENV_PATH = "/home/z/my-project/venv/bin/python3";
const SCRIPT_PATH = "/home/z/my-project/scripts/vnstock_api.py";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "history";
  const days = searchParams.get("days") || "365";

  try {
    let command = "";

    switch (type) {
      case "history":
        command = `${VENV_PATH} ${SCRIPT_PATH} history --symbol ${symbol} --days ${days}`;
        break;
      case "finance":
        command = `${VENV_PATH} ${SCRIPT_PATH} finance --symbol ${symbol}`;
        break;
      case "overview":
        command = `${VENV_PATH} ${SCRIPT_PATH} overview --symbol ${symbol}`;
        break;
      default:
        command = `${VENV_PATH} ${SCRIPT_PATH} history --symbol ${symbol} --days ${days}`;
    }

    const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

    if (stderr && !stderr.includes("INFO")) {
      console.error("Python stderr:", stderr);
    }

    const result = JSON.parse(stdout);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching stock data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
