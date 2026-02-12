// api/popular-movies.js
import popular from "./popular.js";

export default function handler(req, res) {
  req.query = { ...(req.query || {}), media: "movie" };
  return popular(req, res);
}
