// index.ts
import { getProjectItems, IssueContent, ProjectV2Data, ProjectV2ItemFieldNumberValueNode } from "./github";
import * as fs from "fs";
import { createCanvas } from "canvas";
import { Chart, ChartConfiguration } from "chart.js/auto";
import annotationPlugin from 'chartjs-plugin-annotation';
import { formatInTimeZone } from 'date-fns-tz';

// Register the annotation plugin
Chart.register(annotationPlugin);

export async function createBurndownChart(token: string, projectId: string, endDateStr?: string, timezone?: string, label?: string) {

  // Default to Melbourne timezone if none provided
  if (!timezone) {
    timezone = 'Australia/Melbourne';
  }

  // Default to today if no end date provided
  const endDate = endDateStr ? new Date(formatInTimeZone(endDateStr, timezone, 'yyyy-MM-dd')) : new Date();

  console.log(`Generating burndown chart with end date: ${formatDate(endDate)}`);

  // Fetch project items
  console.log("Fetching project items...");
  const projectData = await getProjectItems(token, projectId);

  if (!projectData) {
    console.error("Failed to fetch project data or project not found.");
    return null;
  }

  // Process data for burndown chart
  console.log("Calculating burndown data...");
  const burndownData = calculateBurndownData(projectData, endDate, label);

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
function calculateBurndownData(projectData: ProjectV2Data, endDate: Date, sprintLabel?: string) {
  // Extract items
  // Note: For projects with many items, you'll need to implement pagination
  // by checking items.pageInfo.hasNextPage and using items.pageInfo.endCursor
  const items = projectData.items.nodes;

  // Calculate total story points
  let totalStoryPoints = 0;

  // Map to track daily remaining points
  const dailyBurnPoints = new Map();

  // Get the start date (earliest creation date)
  let startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 14); // Default to 2 weeks prior if no earlier items

  // Iterate through items to find the earliest date and calculate total points
  items.forEach(item => {
    // Get estimate (story points)
    const estimateField = item.fieldValues.nodes.find(
      field => field.field?.name === "Estimate"
    );

    const storyPoints = (estimateField as ProjectV2ItemFieldNumberValueNode)?.number || 0;
    if (sprintLabel) {
      if ((item.content as IssueContent).labels.nodes.find(label => label.name === sprintLabel)) {
        totalStoryPoints += storyPoints;
      }
    } else {
      totalStoryPoints += storyPoints;
    }

    // Get creation date
    // const creationDate = new Date(item.createdAt);
    // if (creationDate < startDate) {
    //   startDate = creationDate;
    // }
  });

  // Initialize daily points with total at start
  const dateArray = generateDateArray(startDate, endDate);
  dateArray.forEach(date => {
    dailyBurnPoints.set(formatDate(date), 0);
  });

  // Update daily remaining points based on item completion
  items.forEach(item => {
    const estimateField = item.fieldValues.nodes.find(
      field => field.field?.name === "Estimate"
    );
    const storyPoints = (estimateField as ProjectV2ItemFieldNumberValueNode)?.number || 0;
    // If the item is closed, reduce points on that day
    let closedDate = null;
    if (item.content && item.content.closedAt) {
      closedDate = new Date(item.content.closedAt);
    }
    // issue body has <closed-at>YYYY-MM-DD</closed-at>
    if (item.content && item.content.body) {
      const closedAtRegex = /<closed-at>(\d{4}-\d{2}-\d{2})<\/closed-at>/;
      const match = item.content.body.match(closedAtRegex);
      if (match) {
        closedDate = new Date(match[1]);
      }
    }
    if (closedDate){
      if (closedDate <= endDate) {
        const closedDateStr = formatDate(closedDate);
        if (dailyBurnPoints.has(closedDateStr)) {
          dailyBurnPoints.set(
            closedDateStr,
            dailyBurnPoints.get(closedDateStr) + storyPoints
          );
        }
      }
    }
  });


  // Fill in the actual burndown line by propagating values forward
  const actualBurnDown = []
  let previousValue = totalStoryPoints;
  for (const date of dateArray) {
    const dateStr = formatDate(date);
    const burnPoints = dailyBurnPoints.get(dateStr);
    const currentValue = previousValue - (burnPoints || 0);
    actualBurnDown.push(currentValue);
    previousValue = currentValue;
  }

  // Calculate ideal burndown (straight line from start to end)
  const idealBurndown = calculateIdealBurndown(totalStoryPoints, dateArray.length);

  return {
    dates: dateArray.map(date => formatDate(date)),
    actual: actualBurnDown,
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

  // Get current date in the same format as our dates array
  const currentDate = new Date();
  const currentDateStr = formatDate(currentDate);

  // Find the index of the current date in our dates array
  const currentDateIndex = burndownData.dates.indexOf(currentDateStr);

  // If current date is before the end date, adjust the actual data to stop at current date
  let actualData = [...burndownData.actual];
  if (currentDate < burndownData.endDate && currentDateIndex !== -1) {
    // Keep data up to current date, set the rest to null (Chart.js will not draw null values)
    for (let i = currentDateIndex + 1; i < actualData.length; i++) {
      actualData[i] = null;
    }
  }

  // Configure chart with annotations
  const config: ChartConfiguration = {
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
          data: actualData,
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
        annotation: {
          annotations: currentDateIndex !== -1 ? {
            currentDateLine: {
              type: 'line',
              xMin: currentDateIndex,
              xMax: currentDateIndex,
              borderColor: 'rgba(75, 192, 192, 0.8)',
              borderWidth: 2,
              borderDash: [3, 3],
              label: {
                display: true,
                content: 'Current Date',
                position: 'start',
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                font: {
                  size: 11
                }
              }
            }
          } : {}
        }
      },
    },
  };

  // Create chart with configuration
  new Chart(ctx, config);

  // Convert canvas to buffer
  return canvas.toBuffer("image/png");
}
