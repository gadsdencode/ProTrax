// Quick test script for portfolio email functionality
const baseUrl = process.env.REPL_URL || 'http://localhost:5000';

async function testPortfolioEmail() {
  console.log('Testing Portfolio Email Generation...\n');
  
  try {
    // First, fetch active projects to see what's in the database
    const debugResponse = await fetch(`${baseUrl}/api/debug/active-projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers here if needed
      }
    });

    if (!debugResponse.ok) {
      console.error('Failed to fetch active projects:', debugResponse.status);
      console.log('Note: This endpoint requires authentication. Please test via UI.');
      return;
    }

    const debugData = await debugResponse.json();
    console.log('Active Projects in Database:');
    console.log('- Total projects:', debugData.totalProjects);
    console.log('- Active projects:', debugData.activeProjects);
    console.log('- Projects with tasks:', debugData.projectsWithTasks.length);
    console.log('- Projects without tasks:', debugData.projectsWithoutTasks.length);
    
    if (debugData.projectsWithTasks.length > 0) {
      console.log('\nProjects that have tasks:');
      debugData.projectsWithTasks.forEach(p => {
        console.log(`  - ${p.name}: ${p.taskCount} tasks`);
      });
    }

    // Attempt to send portfolio summary email
    console.log('\nAttempting to send portfolio summary email...');
    const emailResponse = await fetch(`${baseUrl}/api/email/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType: 'summary',
        projectId: 'all',
        recipients: [
          { email: 'test@example.com', name: 'Test User' }
        ]
      })
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email:', emailResponse.status);
      console.log('Note: This endpoint requires authentication. Please test via UI.');
      return;
    }

    const emailResult = await emailResponse.json();
    console.log('Portfolio email sent successfully!');
    console.log('Response:', emailResult);
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testPortfolioEmail();