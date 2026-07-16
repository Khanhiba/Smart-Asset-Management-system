import OpenAI from 'openai';

function localInsights(snapshot) {
  const items = [];
  if (snapshot.overdueLoans) items.push({ level: 'high', title: `${snapshot.overdueLoans} overdue loan${snapshot.overdueLoans === 1 ? '' : 's'}`, body: 'Prioritize returns and notify custodians before devices become loss risks.', action: 'Review overdue assets' });
  if (snapshot.openMaintenance) items.push({ level: 'high', title: `${snapshot.openMaintenance} open maintenance ticket${snapshot.openMaintenance === 1 ? '' : 's'}`, body: 'Schedule technician capacity around due dates to avoid unavailable teaching equipment.', action: 'Open maintenance queue' });
  if (snapshot.lowCondition) items.push({ level: 'medium', title: `${snapshot.lowCondition} asset${snapshot.lowCondition === 1 ? '' : 's'} need attention`, body: 'Poor-condition equipment should be inspected before its next assignment.', action: 'Inspect at-risk assets' });
  if (snapshot.warrantyExpiring) items.push({ level: 'medium', title: 'Warranty window is closing', body: `${snapshot.warrantyExpiring} assets have a warranty expiring within 45 days. Record any defects before coverage ends.`, action: 'Review warranties' });
  items.push({ level: 'positive', title: `${snapshot.availableRate}% of inventory is ready`, body: 'Available capacity is calculated after excluding retired assets and equipment in maintenance.', action: 'View inventory' });
  return items.slice(0, 4);
}

export async function generateInsights(snapshot) {
  const fallback = { source: 'rules', summary: 'Operational recommendations generated from your live asset signals.', insights: localInsights(snapshot) };
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', temperature: 0.3, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'You are a university asset operations analyst. Produce JSON only with summary (string) and insights (array of 3 objects: level high|medium|positive, title, body, action). Give specific concise actions. Do not invent figures or mention personal data.' },
      { role: 'user', content: JSON.stringify(snapshot) },
    ] });
    const content = JSON.parse(response.choices[0].message.content);
    if (!Array.isArray(content.insights)) throw new Error('Invalid AI response shape');
    return { source: 'openai', summary: content.summary, insights: content.insights.slice(0, 4) };
  } catch (error) { console.warn('OpenAI insight fallback:', error.message); return fallback; }
}
