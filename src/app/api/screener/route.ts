import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const VENV_PATH = "/home/z/my-project/venv/bin/python3";
const SCRIPT_PATH = "/home/z/my-project/scripts/vnstock_api.py";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "50";

  try {
    const { stdout, stderr } = await execAsync(
      `${VENV_PATH} ${SCRIPT_PATH} screener --limit ${limit}`,
      { timeout: 120000 } // 2 minutes timeout for screener
    );

    if (stderr && !stderr.includes("INFO")) {
      console.error("Python stderr:", stderr);
    }

    const result = JSON.parse(stdout);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching screener data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch screener data" },
      { status: 500 }
    );
  }
}
