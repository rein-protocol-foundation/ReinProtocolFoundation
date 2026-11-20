import { createServer } from 'node:http'

createServer(async (request, response) => {
  const { pathname: path, searchParams } = new URL(request.url, 'http://localhost')
  let result = []
  if (path.endsWith('/dev_consume_form_rate_limit')) result = true
  if (path.endsWith('/dev_register_community_participant')) {
    let body = ''
    for await (const chunk of request) body += chunk
    const data = JSON.parse(body)
    if (data.p_email !== 'member@example.invalid' || data.p_location_scope !== null || data.p_industry !== null) {
      response.statusCode = 400
    }
    result = [{ participant_id: '00000000-0000-4000-8000-000000000001' }]
  }
  if (path.endsWith('/dev_resources') && searchParams.get('learning_metadata->>coding_requirement') !== 'eq.none') {
    result = [{
      id: 'example', title: 'Example course', resource_type: 'Course', language: 'English and Chinese',
      summary: 'Course description.', background: 'Basic Python.', public_url: 'https://example.org/en',
      languages: [{ code: 'zh-CN', url: 'https://example.org/zh' }],
    }]
  }
  if (path.endsWith('/dev_events')) response.statusCode = 503
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(result))
}).listen(4189, '127.0.0.1')
