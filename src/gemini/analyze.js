export async function analyzeIssueImage(imageBase64, mimeType = 'image/jpeg') {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              },
              {
                type: 'text',
                text: `Analyze this image of a civic issue. Return ONLY raw JSON, no markdown, no backticks:
{
  "severity": "Low or Medium or High",
  "description": "one sentence describing the issue",
  "suggested_action": "what authorities should do",
  "estimated_repair_time": "e.g. 1-2 days"
}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.warn('AI error, using fallback:', data.error);
      return getFallback();
    }

    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);

  } catch (err) {
    console.warn('AI failed, using fallback:', err);
    return getFallback();
  }
}

function getFallback() {
  return {
    severity: 'Medium',
    description: 'Civic issue detected requiring attention from local authorities.',
    suggested_action: 'Authorities should inspect and resolve the reported issue promptly.',
    estimated_repair_time: '2-3 days',
  };
}
export async function checkDuplicate(newIssue, existingIssues) {
  if (existingIssues.length === 0) return null;

  const summary = existingIssues.slice(0, 10).map(i =>
    `ID:${i.id} | ${i.category} | ${i.location_name} | ${i.description}`
  ).join('\n');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{
          role: 'user',
          content: `New issue being reported:
Category: ${newIssue.category}
Location: ${newIssue.location_name}
Description: ${newIssue.description}

Existing issues:
${summary}

Is the new issue a duplicate of any existing issue? Return ONLY raw JSON:
{
  "is_duplicate": true or false,
  "duplicate_id": "the ID if duplicate, else null",
  "confidence": "High or Medium or Low",
  "reason": "one sentence explanation"
}`
        }]
      })
    });

    // if rate limited, silently skip
    if (response.status === 429) return null;

    const data = await response.json();
    if (data.error) return null;
    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}