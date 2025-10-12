// Test script for verifying the metrics endpoint with historical data

import { createServer } from 'http';

const baseUrl = 'http://localhost:5000';

// Simple fetch with auth header (you'll need to replace with actual auth token)
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
}

async function testMetricsEndpoint() {
  console.log('Testing Sprint Metrics Endpoint...\n');
  
  try {
    // First, let's check if we have any sprints
    const sprintsResponse = await authenticatedFetch(`${baseUrl}/api/sprints?projectId=1`);
    
    if (!sprintsResponse.ok) {
      console.log('Could not fetch sprints. You may need to authenticate first.');
      console.log('Please ensure you have a project and sprint created in the application.');
      return;
    }
    
    const sprints = await sprintsResponse.json();
    
    if (sprints.length === 0) {
      console.log('No sprints found. Please create a sprint first.');
      return;
    }
    
    // Test the metrics endpoint for the first sprint
    const sprint = sprints[0];
    console.log(`Testing metrics for sprint: ${sprint.name} (ID: ${sprint.id})`);
    
    const metricsResponse = await authenticatedFetch(`${baseUrl}/api/sprints/${sprint.id}/metrics`);
    
    if (!metricsResponse.ok) {
      console.log(`Failed to fetch metrics: ${metricsResponse.statusText}`);
      return;
    }
    
    const metrics = await metricsResponse.json();
    
    console.log('\n=== Sprint Metrics Summary ===');
    console.log(`Total Story Points: ${metrics.totalStoryPoints}`);
    console.log(`Completed Story Points: ${metrics.completedStoryPoints}`);
    console.log(`Total Tasks: ${metrics.totalTasks}`);
    console.log(`Completed Tasks: ${metrics.completedTasks}`);
    
    console.log('\n=== Burndown Data (First 5 days) ===');
    metrics.burndownData.slice(0, 5).forEach((data: any) => {
      console.log(`Date: ${data.date}, Ideal: ${data.ideal}, Actual: ${data.actual}`);
    });
    
    console.log('\n=== CFD Data (First 5 days) ===');
    metrics.cfdData.slice(0, 5).forEach((data: any) => {
      console.log(`Date: ${data.date}, Todo: ${data.todo}, In Progress: ${data.inProgress}, Review: ${data.review}, Done: ${data.done}`);
    });
    
    // Check if we're using historical data or fallback
    const hasHistoricalData = metrics.burndownData.some((d: any, i: number) => 
      i > 0 && i < metrics.burndownData.length - 1 && d.actual !== metrics.totalStoryPoints
    );
    
    if (hasHistoricalData) {
      console.log('\n✅ Metrics are using REAL historical data!');
    } else {
      console.log('\n⚠️  No historical data found - using fallback simulation.');
      console.log('   This is expected for new sprints without task updates.');
    }
    
  } catch (error) {
    console.error('Error testing metrics:', error);
  }
}

// Run the test
testMetricsEndpoint();