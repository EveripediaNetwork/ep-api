import Sentry from '@sentry/nestjs'

// Conditionally import profiling integration to handle environments where it's not available
let nodeProfilingIntegration: any = null
try {
  const profilingModule = require('@sentry/profiling-node')
  nodeProfilingIntegration = profilingModule.nodeProfilingIntegration
} catch (error) {
  // Profiling integration not available in this environment (e.g., during tests)
  console.warn(
    'Sentry profiling integration not available:',
    (error as Error).message,
  )
}

const integrations = []
if (nodeProfilingIntegration && process.env.NODE_ENV !== 'test') {
  integrations.push(nodeProfilingIntegration())
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations,
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.2,
  ignoreErrors: ['RangeError'],
})
