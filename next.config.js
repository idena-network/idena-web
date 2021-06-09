module.exports = {
  async redirects() {
    return [
      {
        source: '/dna/signin/v(\\d{1,})',
        destination: '/dna/signin',
        permanent: false,
      },
    ]
  },
}
