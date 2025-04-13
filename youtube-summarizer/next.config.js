/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix for Windows symlink issues
  experimental: {
    // Disable JSON symlinks to avoid Windows errors
    disableOptimizedLoading: true
  },
  // Disable file system cache for Windows compatibility
  generateBuildId: async () => {
    return `build-${Date.now()}`
  }
};

module.exports = nextConfig; 