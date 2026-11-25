export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This email is already registered.' });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
}
