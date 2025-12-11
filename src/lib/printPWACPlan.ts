import type { EventPlanData } from "@/components/plan-with-click/PlanWithClickDialog";

interface PrintPWACData {
  eventName: string;
  eventDate?: Date;
  plan: EventPlanData;
  items: Array<{ name: string; category: string; notes?: string; status: string }>;
  tasks: Array<{ title: string; completed: boolean }>;
}

/**
 * Generate printable HTML for PWAC plan and trigger print dialog
 * Uses the same pattern as GroceryListTab.tsx
 */
export const printPWACPlan = (data: PrintPWACData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return false;
  }

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Group items by category
  const itemsByCategory = data.items.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof data.items>);

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Plan - ${data.eventName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 24px;
      color: #222;
      background: #fff;
      line-height: 1.6;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #ECEEEB;
    }
    
    .brand {
      color: #142E26;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .tagline {
      color: #5E625E;
      font-size: 12px;
      margin-top: 4px;
    }
    
    /* Event Header */
    .event-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .event-name {
      font-size: 28px;
      font-weight: 700;
      color: #142E26;
      margin-bottom: 8px;
    }
    
    .event-date {
      font-size: 16px;
      color: #5E625E;
      margin-bottom: 8px;
    }
    
    .shared-badge {
      display: inline-block;
      font-size: 11px;
      color: #5E625E;
      background: #F7F9F7;
      padding: 4px 12px;
      border-radius: 12px;
      margin-top: 8px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 28px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #142E26;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ECEEEB;
    }
    
    .section-content {
      color: #222;
      font-size: 14px;
    }
    
    .empty-placeholder {
      color: #5E625E;
      font-style: italic;
      font-size: 13px;
    }
    
    /* Lists */
    ul {
      list-style: none;
      padding: 0;
    }
    
    li {
      padding: 8px 0;
      border-bottom: 1px solid #ECEEEB;
    }
    
    li:last-child {
      border-bottom: none;
    }
    
    .item-name {
      font-weight: 500;
    }
    
    .item-meta {
      font-size: 12px;
      color: #5E625E;
      margin-top: 2px;
    }
    
    .status-badge {
      display: inline-block;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      background: #F7F9F7;
      color: #5E625E;
      margin-left: 8px;
    }
    
    .status-done {
      background: #E8F5E9;
      color: #2E7D32;
    }
    
    /* Tasks */
    .task-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .task-checkbox {
      width: 16px;
      height: 16px;
      border: 2px solid #5E625E;
      border-radius: 3px;
      flex-shrink: 0;
    }
    
    .task-checkbox.checked {
      background: #142E26;
      border-color: #142E26;
      position: relative;
    }
    
    .task-checkbox.checked::after {
      content: '✓';
      color: white;
      font-size: 10px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    
    .task-title.completed {
      text-decoration: line-through;
      color: #5E625E;
    }
    
    /* Category Headers */
    .category-header {
      font-size: 13px;
      font-weight: 600;
      color: #5E625E;
      margin-top: 16px;
      margin-bottom: 8px;
      text-transform: capitalize;
    }
    
    .category-header:first-child {
      margin-top: 0;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid #ECEEEB;
      text-align: center;
    }
    
    .footer-text {
      font-size: 12px;
      color: #5E625E;
    }
    
    .footer-link {
      color: #142E26;
      font-weight: 600;
    }
    
    /* Watermark */
    .watermark {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-size: 10px;
      color: rgba(20, 46, 38, 0.08);
      font-weight: 700;
      transform: rotate(-45deg);
      pointer-events: none;
    }
    
    /* Print Styles */
    @media print {
      body {
        padding: 20px;
      }
      
      .watermark {
        display: block;
      }
      
      @page {
        margin: 0.5in;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="brand">SimplifiedHost</div>
    <div class="tagline">Plan Confidently. Host Effortlessly.</div>
  </div>
  
  <!-- Event Header -->
  <div class="event-header">
    <h1 class="event-name">${escapeHtml(data.eventName)}</h1>
    ${data.eventDate ? `<div class="event-date">${formatDate(data.eventDate)}</div>` : ''}
    <span class="shared-badge">Shared via SimplifiedHost</span>
  </div>
  
  <!-- Summary -->
  <div class="section">
    <h2 class="section-title">Summary</h2>
    <div class="section-content">
      ${data.plan.planSummary ? escapeHtml(data.plan.planSummary) : '<p class="empty-placeholder">No summary available.</p>'}
    </div>
  </div>
  
  <!-- Activities & Games -->
  <div class="section">
    <h2 class="section-title">Activities & Games</h2>
    <div class="section-content">
      ${generateActivitiesHtml(data.plan)}
    </div>
  </div>
  
  <!-- Menu Suggestions -->
  <div class="section">
    <h2 class="section-title">Menu Suggestions</h2>
    <div class="section-content">
      ${generateMenuHtml(data.plan)}
    </div>
  </div>
  
  <!-- Items -->
  <div class="section">
    <h2 class="section-title">Items</h2>
    <div class="section-content">
      ${generateItemsHtml(itemsByCategory)}
    </div>
  </div>
  
  <!-- Tasks -->
  <div class="section">
    <h2 class="section-title">Tasks</h2>
    <div class="section-content">
      ${generateTasksHtml(data.tasks)}
    </div>
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <p class="footer-text">Created with <span class="footer-link">SimplifiedHost</span> — Plan Confidently.</p>
    <p class="footer-text">simplifiedhost.com</p>
  </div>
  
  <!-- Watermark -->
  <div class="watermark">SimplifiedHost</div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Delay to ensure content is loaded before printing
  setTimeout(() => {
    printWindow.print();
  }, 250);

  return true;
};

// Helper functions
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateActivitiesHtml(plan: EventPlanData): string {
  // Extract activities from timeline's during-event phase
  const duringEvent = plan.timeline?.duringEvent;
  
  if (!duringEvent || duringEvent.length === 0) {
    return '<p class="empty-placeholder">No activities planned yet.</p>';
  }
  
  return `
    <ul>
      ${duringEvent.map(task => `
        <li>${escapeHtml(task)}</li>
      `).join('')}
    </ul>
  `;
}

function generateMenuHtml(plan: EventPlanData): string {
  if (!plan.menuItems || plan.menuItems.length === 0) {
    return '<p class="empty-placeholder">No menu suggestions yet.</p>';
  }
  
  return plan.menuItems.map(category => `
    <div class="category-header">${escapeHtml(category.category)}</div>
    <ul>
      ${category.items.map(item => `
        <li class="item-name">${escapeHtml(item.name)}</li>
      `).join('')}
    </ul>
  `).join('');
}

function generateItemsHtml(itemsByCategory: Record<string, Array<{ name: string; category: string; notes?: string; status: string }>>): string {
  const categories = Object.keys(itemsByCategory);
  
  if (categories.length === 0) {
    return '<p class="empty-placeholder">No items added yet.</p>';
  }
  
  return categories.map(category => `
    <div class="category-header">${escapeHtml(category)}</div>
    <ul>
      ${itemsByCategory[category].map(item => `
        <li>
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="status-badge ${item.status === 'Done' ? 'status-done' : ''}">${item.status}</span>
          ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ''}
        </li>
      `).join('')}
    </ul>
  `).join('');
}

function generateTasksHtml(tasks: Array<{ title: string; completed: boolean }>): string {
  if (!tasks || tasks.length === 0) {
    return '<p class="empty-placeholder">No tasks added yet.</p>';
  }
  
  return `
    <ul>
      ${tasks.map(task => `
        <li class="task-item">
          <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
          <span class="task-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}
