import { NextRequest, NextResponse } from "next/server";
import { jobScheduler, scheduleRecurringJobs } from "~/lib/background-jobs";

// Start background jobs
export async function POST(request: NextRequest) {
  try {
    // Start the job scheduler
    jobScheduler.start();

    // Schedule recurring jobs
    scheduleRecurringJobs();

    return NextResponse.json({
      success: true,
      message: "Background jobs started successfully"
    });
  } catch (error) {
    console.error("Failed to start background jobs:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to start background jobs",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Get job status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Job status endpoint",
    jobs: {
      network_sentiment: "Running hourly",
      leaderboard: "Running every 30 minutes",
      social_sync: "Manual trigger available"
    }
  });
}