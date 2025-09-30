// Build information generated at deployment time
export const BUILD_INFO = {
  timestamp: new Date().toISOString(),
  buildTime: new Date().toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome'
  }),
  // This will be updated by the build process
  commitHash: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
  commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'Local development'
};