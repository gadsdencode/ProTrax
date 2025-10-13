// Debug script to test task fetching for portfolio
import { db } from './server/database.js';
import { projects, tasks } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testTaskFetching() {
  console.log('Testing Task Fetching for Portfolio Email...\n');
  
  try {
    // 1. Get active projects (same as portfolio email)
    const allProjects = await db.select().from(projects);
    const activeProjects = allProjects.filter(p => p.status === 'active');
    
    console.log(`Found ${activeProjects.length} active projects\n`);
    
    // 2. Test fetching tasks for each project (same as portfolio email)
    for (const project of activeProjects.slice(0, 5)) {
      console.log(`\nProject: ${project.name} (ID: ${project.id})`);
      
      // Direct DB query
      const directTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, project.id));
      
      console.log(`  - Direct DB query: ${directTasks.length} tasks`);
      
      if (directTasks.length > 0) {
        console.log(`  - First task: ${directTasks[0].title}`);
      }
    }
    
    // 3. Test specific project 48 which we know has 47 tasks
    console.log('\n--- Testing Project 48 (Website Redesign) ---');
    const project48Tasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, 48));
    
    console.log(`Project 48 has ${project48Tasks.length} tasks`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testTaskFetching();