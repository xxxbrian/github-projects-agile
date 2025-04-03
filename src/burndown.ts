// index.ts
import { getProjectItems } from "./github";
import * as fs from "fs";
import { createCanvas } from "canvas";
import { Chart } from "chart.js/auto";

// Parse command line arguments and run
export async function createBurndownChart(token: string, projectId: string, endDateStr?: string) {
  // Get token, project ID, and end date from environment or command line
  // let token = process.env.GITHUB_TOKEN || "";
  // let projectId = process.env.PROJECT_ID || "";
  // let endDateStr = process.env.END_DATE;

  // // Check if arguments were provided at the command line
  // if (process.argv.length > 2) {
  //   const args = process.argv.slice(2);
  //   for (let i = 0; i < args.length; i++) {
  //     if (args[i] === "--token" && i + 1 < args.length) {
  //       token = args[i + 1];
  //       i++;
  //     } else if (args[i] === "--project-id" && i + 1 < args.length) {
  //       projectId = args[i + 1];
  //       i++;
  //     } else if (args[i] === "--end-date" && i + 1 < args.length) {
  //       endDateStr = args[i + 1];
  //       i++;
  //     }
  //   }
  // }

  // if (!token || !projectId) {
  //   console.error("Please provide token and project ID via environment variables or command-line arguments:");
  //   console.error("  GITHUB_TOKEN and PROJECT_ID environment variables");
  //   console.error("  OR --token and --project-id command-line arguments");
  //   process.exit(1);
  // }

  // Default to today if no end date provided
  const endDate = endDateStr ? new Date(endDateStr) : new Date();

  console.log(`Generating burndown chart with end date: ${formatDate(endDate)}`);

  // Fetch project items
  console.log("Fetching project items...");
  const projectData = await getProjectItems(token, projectId);

  if (!projectData) {
    console.error("Failed to fetch project data or project not found.");
    process.exit(1);
  }

  // Process data for burndown chart
  console.log("Calculating burndown data...");
  const burndownData = calculateBurndownData(projectData, endDate);

  // Generate chart image
  console.log("Generating chart...");
  const chartImageBuffer = await generateBurndownChart(burndownData, projectData.title);

  // Save image
  const uuid = crypto.randomUUID();
  // create directory if it doesn't exist
  if (!fs.existsSync('./burndown')) {
    fs.mkdirSync('./burndown');
  }
  const outputFilename = `./burndown/${uuid}.png`;
  fs.writeFileSync(outputFilename, chartImageBuffer);
  console.log(`Burndown chart saved as ${outputFilename}`);

  return uuid;
}

// Calculate burndown data from project items
function calculateBurndownData(projectData, endDate) {
  // Extract items
  // Note: For projects with many items, you'll need to implement pagination
  // by checking items.pageInfo.hasNextPage and using items.pageInfo.endCursor
  const items = projectData.items.nodes;

  // Calculate total story points
  let totalStoryPoints = 0;

  // Map to track daily remaining points
  const dailyRemainingPoints = new Map();

  // Get the start date (earliest creation date)
  let startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 14); // Default to 2 weeks prior if no earlier items

  // Iterate through items to find the earliest date and calculate total points
  items.forEach(item => {
    // Get estimate (story points)
    const estimateField = item.fieldValues.nodes.find(
      field => field.field?.name === "Estimate"
    );

    const storyPoints = estimateField?.number || 0;
    totalStoryPoints += storyPoints;

    // Get creation date
    const creationDate = new Date(item.createdAt);
    if (creationDate < startDate) {
      startDate = creationDate;
    }
  });

  // Initialize daily points with total at start
  const dateArray = generateDateArray(startDate, endDate);
  dateArray.forEach(date => {
    dailyRemainingPoints.set(formatDate(date), totalStoryPoints);
  });

  // Update daily remaining points based on item completion
  items.forEach(item => {
    const estimateField = item.fieldValues.nodes.find(
      field => field.field?.name === "Estimate"
    );
    const storyPoints = estimateField?.number || 0;

    // If the item is closed, reduce points on that day
    if (item.content && item.content.closedAt) {
      const closedDate = new Date(item.content.closedAt);
      if (closedDate <= endDate) {
        const closedDateStr = formatDate(closedDate);
        if (dailyRemainingPoints.has(closedDateStr)) {
          dailyRemainingPoints.set(
            closedDateStr,
            dailyRemainingPoints.get(closedDateStr) - storyPoints
          );
        }
      }
    }
  });

  // Fill in the actual burndown line by propagating values forward
  let previousValue = totalStoryPoints;
  for (const date of dateArray) {
    const dateStr = formatDate(date);
    const currentValue = dailyRemainingPoints.get(dateStr);

    if (currentValue === totalStoryPoints) {
      // No change on this day, use previous value
      dailyRemainingPoints.set(dateStr, previousValue);
    } else {
      // Update previous value for next iteration
      previousValue = currentValue;
    }
  }

  // Calculate ideal burndown (straight line from start to end)
  const idealBurndown = calculateIdealBurndown(totalStoryPoints, dateArray.length);

  return {
    dates: dateArray.map(date => formatDate(date)),
    actual: dateArray.map(date => dailyRemainingPoints.get(formatDate(date))),
    ideal: idealBurndown,
    totalStoryPoints,
    startDate,
    endDate
  };
}

// Calculate ideal burndown
function calculateIdealBurndown(totalPoints, numDays) {
  const idealBurndown = [];

  // If we only have one day, return a flat line
  if (numDays <= 1) {
    return [totalPoints];
  }

  const dailyDecrement = totalPoints / (numDays - 1);

  for (let i = 0; i < numDays; i++) {
    idealBurndown.push(Math.max(0, totalPoints - (dailyDecrement * i)));
  }

  return idealBurndown;
}

// Generate an array of dates between start and end
function generateDateArray(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// Format date for display (MM/DD)
function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Generate burndown chart using Chart.js and canvas
async function generateBurndownChart(burndownData, projectTitle) {
  // Create canvas
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Format x-axis labels to be more readable (MM/DD format)
  const displayLabels = burndownData.dates.map(dateStr => formatDisplayDate(dateStr));

  // Create chart
  new Chart(ctx, {
    type: "line",
    data: {
      labels: displayLabels,
      datasets: [
        {
          label: "Ideal Burndown",
          data: burndownData.ideal,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderDash: [5, 5],
          tension: 0.1,
        },
        {
          label: "Actual Burndown",
          data: burndownData.actual,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: "Date",
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          title: {
            display: true,
            text: "Remaining Story Points",
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          min: 0,
          max: Math.ceil(burndownData.totalStoryPoints * 1.1), // Add 10% padding
        },
      },
      plugins: {
        title: {
          display: true,
          text: `Burndown Chart - ${projectTitle}`,
          font: {
            size: 18,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        subtitle: {
          display: true,
          text: `${formatDate(burndownData.startDate)} to ${formatDate(burndownData.endDate)}`,
          font: {
            size: 14
          },
          padding: {
            bottom: 10
          }
        },
        legend: {
          position: "bottom",
          labels: {
            font: {
              size: 12
            }
          }
        },
      },
    },
  });

  // Convert canvas to buffer
  return canvas.toBuffer("image/png");
}

// // Start the program
// main().catch(error => {
//   console.error("Error:", error);
//   process.exit(1);
// });