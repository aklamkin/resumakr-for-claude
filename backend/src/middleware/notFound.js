export const notFound = (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
};
