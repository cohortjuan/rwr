import type { NextConfig } from 'next'

// Dev only: lets other devices on your network (a phone, for example) load the dev server.
// Set DEV_ORIGINS in .env.local to a comma-separated list of hostnames or IP addresses.
const devOrigins = (process.env.DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
}

export default nextConfig
