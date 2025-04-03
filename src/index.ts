import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { logger } from 'hono/logger'
import { env } from 'hono/adapter'

import { createBurndownChart } from './burndown';
const app = new Hono()
app.use(logger())

app.get('/*', serveStatic({ root: './frontend/dist' }))

app.get('/burndown', async(c) => {
  let token = c.req.query('token')
  const projectId = c.req.query('project-id')
  const endDate = c.req.query('end-date')

  const { ENV_PROJECT_WHITE_LIST } = env<{ ENV_PROJECT_WHITE_LIST: string }>(c)
  const { ENV_GITHUB_TOKEN } = env<{ ENV_GITHUB_TOKEN: string }>(c)

  // white list project don't need token
  const projectWhiteList = ENV_PROJECT_WHITE_LIST ? ENV_PROJECT_WHITE_LIST.split(',').map(s => s.trim()) : []
  if (projectId && !token && projectWhiteList.includes(projectId) && ENV_GITHUB_TOKEN) {
    token = ENV_GITHUB_TOKEN
  }

  if (!token || !projectId) {
    return c.json({ error: 'Please provide token and project ID' }, 400);
  }

  const uuid = await createBurndownChart(token, projectId, endDate);

  // return image path
  return c.json({ burndownChart: `/burndown/${uuid}.png` });
});

app.use('/burndown/*', serveStatic({ root: './' }))

export default app
